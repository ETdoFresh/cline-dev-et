import { Anthropic } from "@anthropic-ai/sdk"
import { ApiHandler } from "../../api"
import { ApiStream } from "../../api/transform/stream"
import { TaskState } from "../task/TaskState"
import { TaskHistory } from "../task/TaskHistory"
import { MessagePresenter } from "../message/MessagePresenter"
import { ClineApiReqInfo, ClineApiReqCancelReason } from "../../shared/ExtensionMessage"
import { parseAssistantMessage } from "../assistant-message"
import { formatResponse } from "../prompts/responses"
import { findLastIndex } from "../../shared/array"
import { calculateApiCost } from "../../utils/cost"
import { serializeError } from "serialize-error"
import { formatContentBlockToMarkdown } from "../../integrations/misc/export-markdown"
import { truncateHalfConversation } from "../sliding-window"
import { ENHANCED_SYSTEM_PROMPT } from '../prompts/enhanced_system'

export class ApiRequestHandler {
    private api: ApiHandler
    private taskState: TaskState
    private taskHistory: TaskHistory
    private messagePresenter: MessagePresenter
    private customInstructions?: string
    private cwd: string

    constructor(
        api: ApiHandler,
        taskState: TaskState,
        taskHistory: TaskHistory,
        messagePresenter: MessagePresenter,
        cwd: string,
        customInstructions?: string
    ) {
        this.api = api
        this.taskState = taskState
        this.taskHistory = taskHistory
        this.messagePresenter = messagePresenter
        this.cwd = cwd
        this.customInstructions = customInstructions
    }

    async *attemptApiRequest(previousApiReqIndex: number): ApiStream {
        let systemPrompt = await ENHANCED_SYSTEM_PROMPT(
            this.cwd,
            this.api.getModel().info.supportsComputerUse ?? false,
            this.customInstructions
        )

        // Check if we need to truncate conversation history
        if (previousApiReqIndex >= 0) {
            const historyMessages = this.taskHistory.getClineMessages()
            const previousRequest = historyMessages[previousApiReqIndex]
            if (previousRequest?.text) {
                const { tokensIn, tokensOut, cacheWrites, cacheReads }: ClineApiReqInfo = JSON.parse(
                    previousRequest.text
                )
                const totalTokens = (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
                const contextWindow = this.api.getModel().info.contextWindow || 128_000
                const maxAllowedSize = Math.max(contextWindow - 40_000, contextWindow * 0.8)
                if (totalTokens >= maxAllowedSize) {
                    const truncatedMessages = truncateHalfConversation(this.taskHistory.getApiConversationHistory())
                    await this.taskHistory.overwriteApiConversationHistory(truncatedMessages)
                }
            }
        }

        const stream = this.api.createMessage(systemPrompt, this.taskHistory.getApiConversationHistory())
        const iterator = stream[Symbol.asyncIterator]()

        try {
            // Test first chunk for errors
            const firstChunk = await iterator.next()
            yield firstChunk.value
        } catch (error) {
            const { response } = await this.messagePresenter.ask(
                "api_req_failed",
                error.message ?? JSON.stringify(serializeError(error), null, 2)
            )
            if (response !== "yesButtonClicked") {
                throw new Error("API request failed")
            }
            await this.messagePresenter.say("api_req_retried")
            yield* this.attemptApiRequest(previousApiReqIndex)
            return
        }

        yield* iterator
    }

    async processApiRequest(userContent: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[]) {
        if (this.taskState.isAborted()) {
            throw new Error("Cline instance aborted")
        }

        // Show loading state while preparing request
        await this.messagePresenter.say(
            "api_req_started",
            JSON.stringify({
                request:
                    userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n") + "\n\nLoading...",
            })
        )

        // Get previous request index for token tracking
        const previousApiReqIndex = findLastIndex(
            this.taskHistory.getClineMessages(),
            (m) => m.say === "api_req_started"
        )

        // Update request message with actual content
        const lastApiReqIndex = findLastIndex(
            this.taskHistory.getClineMessages(),
            (m) => m.say === "api_req_started"
        )
        const currentMessages = this.taskHistory.getClineMessages()
        currentMessages[lastApiReqIndex].text = JSON.stringify({
            request: userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n"),
        } satisfies ClineApiReqInfo)
        await this.taskHistory.overwriteClineMessages(currentMessages)

        // Track API usage
        let cacheWriteTokens = 0
        let cacheReadTokens = 0
        let inputTokens = 0
        let outputTokens = 0
        let totalCost: number | undefined

        const updateApiReqMsg = (cancelReason?: ClineApiReqCancelReason, streamingFailedMessage?: string) => {
            const updatedMessages = this.taskHistory.getClineMessages()
            updatedMessages[lastApiReqIndex].text = JSON.stringify({
                ...JSON.parse(updatedMessages[lastApiReqIndex].text || "{}"),
                tokensIn: inputTokens,
                tokensOut: outputTokens,
                cacheWrites: cacheWriteTokens,
                cacheReads: cacheReadTokens,
                cost:
                    totalCost ??
                    calculateApiCost(
                        this.api.getModel().info,
                        inputTokens,
                        outputTokens,
                        cacheWriteTokens,
                        cacheReadTokens
                    ),
                cancelReason,
                streamingFailedMessage,
            } satisfies ClineApiReqInfo)
            return updatedMessages
        }

        // Reset streaming state
        this.taskState.resetStreamingState()

        const stream = this.attemptApiRequest(previousApiReqIndex)
        let assistantMessage = ""

        try {
            for await (const chunk of stream) {
                if (this.taskState.isAborted()) {
                    if (!this.taskState.abandoned) {
                        const abortedMessages = updateApiReqMsg("user_cancelled")
                        await this.taskHistory.overwriteClineMessages(abortedMessages)
                    }
                    break
                }

                switch (chunk.type) {
                    case "usage":
                        inputTokens += chunk.inputTokens
                        outputTokens += chunk.outputTokens
                        cacheWriteTokens += chunk.cacheWriteTokens ?? 0
                        cacheReadTokens += chunk.cacheReadTokens ?? 0
                        totalCost = chunk.totalCost
                        break
                    case "text":
                        assistantMessage += chunk.text
                        this.taskState.setStreamingState(parseAssistantMessage(assistantMessage))
                        break
                }

                if (this.taskState.isAborted()) {
                    console.log("aborting stream...")
                    break
                }
            }
        } catch (error) {
            if (!this.taskState.abandoned) {
                const errorMessages = updateApiReqMsg(
                    "streaming_failed",
                    error.message ?? JSON.stringify(serializeError(error), null, 2)
                )
                await this.taskHistory.overwriteClineMessages(errorMessages)
            }
            throw error
        }

        if (this.taskState.isAborted()) {
            throw new Error("Cline instance aborted")
        }

        this.taskState.markStreamComplete()

        // Complete any remaining partial blocks
        const content = this.taskState.getAssistantMessageContent()
        content.forEach(block => {
            if (block.partial) {
                block.partial = false
            }
        })

        // Save final state
        const finalMessages = updateApiReqMsg()
        await this.taskHistory.overwriteClineMessages(finalMessages)

        if (assistantMessage.length > 0) {
            await this.taskHistory.addToApiConversationHistory({
                role: "assistant",
                content: [{ type: "text", text: assistantMessage }],
            })
        } else {
            await this.messagePresenter.say(
                "error",
                "Unexpected API Response: The language model did not provide any assistant messages."
            )
            await this.taskHistory.addToApiConversationHistory({
                role: "assistant",
                content: [{ type: "text", text: "Failure: I did not provide a response." }],
            })
        }

        return assistantMessage
    }
}
