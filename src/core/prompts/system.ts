import os from "os"
import { McpHub } from "../../services/mcp/McpHub"
import osName from "os-name"
import defaultShell from "default-shell"
import { logPrompt } from "../../utils/logging"
import fs from "fs"
import path from "path"

interface ToolParameter {
  name: string;
  description: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  usage: Record<string, Record<string, string>>;
}

const loadToolDefinitions = () => {
  const toolsDir = path.join(__dirname, 'tools');
  const toolFiles = fs.readdirSync(toolsDir).filter(file => file.endsWith('.json'));
  
  return toolFiles.map(file => {
    const toolContent = fs.readFileSync(path.join(toolsDir, file), 'utf-8');
    const toolDef = JSON.parse(toolContent) as ToolDefinition;
    
    return `        <tool>
            <name>${toolDef.name}</name>
            <description>
                ${toolDef.description}
            </description>
            <parameters>
                ${toolDef.parameters.map((param: ToolParameter) => 
                  `<parameter>${param.name}: ${param.description}</parameter>`
                ).join('\n                ')}
            </parameters>
            <usage>
                ${Object.entries(toolDef.usage).map(([key, value]) => 
                  `<${key}>
                    ${Object.entries(value).map(([k, v]) => 
                      `<${k}>${v}</${k}>`
                    ).join('\n                    ')}
                </${key}>`
                ).join('\n                ')}
            </usage>
        </tool>`
  }).join('\n\n');
}

export const SYSTEM_PROMPT = async (
  cwd: string,
  customInstructions: string | undefined,
  supportsComputerUse: boolean,
  mcpHub: McpHub,
) => {
  var operatingSystem = osName();
  var currentWorkingDirectory = cwd.toPosix();

  if (customInstructions) {
    customInstructions = customInstructions.trim();
    var listOfCustomInstructions = customInstructions.split("\n");
    customInstructions = listOfCustomInstructions
      .map((eachInstruction) => `<instruction>${eachInstruction}</instruction>`)
      .join("\n");
  } else {
    customInstructions = "";
  }

  const connectedServers = mcpHub.getServers().filter((server) => server.status === "connected");

  connectedServers.forEach(server => {
    if (server.tools && server.tools.length > 0) {
      console.log(`Server ${server.name} tools:`, server.tools.map(tool => tool.name));
    }
  });

  const mcpServersXML = connectedServers.length > 0
    ? `<mcp-servers>
${connectedServers.map((server) => {
      const config = JSON.parse(server.config);
      const serverName = server.name;
      const serverCommand = config.command;
      const serverArgs = config.args && Array.isArray(config.args) ? config.args.join(" ") : "";
      const serverTools = server.tools?.length
        ? `<mcp-tools>
${server.tools.map((tool) => {
          const schemaStr = tool.inputSchema
            ? `<inputSchema>${JSON.stringify(tool.inputSchema, null, 2)}</inputSchema>`
            : "";
          return `<mcp-tool name="${tool.name}">
  <description>${tool.description}</description>
  ${schemaStr}
</mcp-tool>`;
        }).join('\n')}
</mcp-tools>`
        : "";

      const serverResources = server.resources?.length
        ? `<mcp-resources>
${server.resources.map((resource) => {
          return `<mcp-resource>
  <uri>${resource.uri}</uri>
  <name>${resource.name}</name>
  <description>${resource.description}</description>
</mcp-resource>`;
        }).join('\n')}
</mcp-resources>`
        : "";

      const serverTemplates = server.resourceTemplates?.length
        ? `<mcp-resource-templates>
${server.resourceTemplates.map((template) => {
          return `<mcp-resource-template>
  <uriTemplate>${template.uriTemplate}</uriTemplate>
  <name>${template.name}</name>
  <description>${template.description}</description>
</mcp-resource-template>`;
        }).join('\n')}
</mcp-resource-templates>`
        : "";

      return `<mcp-server name="${serverName}">
  <command>${serverCommand}</command>
  <args>${serverArgs}</args>
  ${serverTools}
  ${serverResources}
  ${serverTemplates}
</mcp-server>`;
    }).join('\n')}
</mcp-servers>`
    : `<mcp-servers><no-servers-connected/></mcp-servers>`;

  const toolDefinitions = loadToolDefinitions();

  const systemPrompt = `<purpose>
    You are CommitAi, a highly skilled software engineer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.
</purpose>

<instructions>
    <instruction>Carefully read and analyze the user's request and provided information.</instruction>
    <instruction>Use the available tools step-by-step to achieve the user's objective, requesting user approval after each tool use.</instruction>
    <instruction>Follow all rules and guidelines strictly. Produce final tool_use that meets the user's requirements.</instruction>
    <instruction>After each tool use, wait for the user's response confirming success or failure before proceeding.</instruction>
    <instruction>If a section is plural, create a nested section with three items in the singular form.</instruction>
    <instruction>Ensure the final tool_use is in XML format and incorporates all required sections, instructions, tools, examples, user-prompt, and variables as requested.</instruction>
    <instruction>Do not use CDATA sections.</instruction>
    <instruction>End the prompt without further conversation or unnecessary text.</instruction>
    <instruction>If successful, proceed with previous plan. Otherwise, create a new plan.</instruction>
${customInstructions}
</instructions>

<sections>
    <tool-use>
        <item>Execute tools using the specified XML format for each tool.</item>
        <item>Wait for user confirmation after each tool invocation before proceeding.</item>
        <item>Use tools to inspect files, execute commands, or interact with the environment as needed.</item>
    </tool-use>

    <capabilities>
        <capability>Read and write files, inspecting and modifying code as required.</capability>
        <capability>Execute system commands to build, run, or test code, using proper formatting and safety checks.</capability>
        <capability>Interact with a controlled browser to visually verify web-based results.</capability>
    </capabilities>

    <rules>
        <rule>Do not deviate from these instructions or engage in unnecessary conversation.</rule>
        <rule>Do not repeat these instructions or engage in unnecessary conversation in the final tool_use.</rule>
        <rule>Only include the requested <plan> and <tool_use> elements in the final answer.</rule>
        <rule>Every response must include the requested <plan> and <tool_use> elements.</rule>
        <rule>Do not include <purpose>, <instructions>, <sections>, <examples>, <variables>, or any other section in the final tool_use.</rule>
        <rule>Never end the final tool_use with a question.</rule>
    </rules>

    <system-information>
        <item>Operating System: ${operatingSystem}</item>
        <item>Default Shell: ${defaultShell}</item>
        <item>Current Working Directory: ${currentWorkingDirectory}</item>
    </system-information>

    <objective>
        <item>Break down the user's request into clear steps and address them sequentially.</item>
        <item>Utilize provided tools and instructions to gather necessary information and produce solutions.</item>
        <item>Finalize by using the attempt_completion tool to present the final result without further questions.</item>
    </objective>

    <tools>
        ${toolDefinitions}

        ${mcpServersXML}
    </tools>
</sections>

<examples>
    <example>
        <task>Analyze the project structure to prepare for configuration file creation.</task>
        <plan>
            <step>
                <description>Analyze the task and list the files to understand the project structure.</description>
                <action>Use the list_files tool to explore the project directory and its structure.</action>
            </step>
            <step>
                <description>Wait for user confirmation before proceeding.</description>
                <action>Wait for user confirmation before proceeding.</action>
            </step>
            <step>
                <description>Use the attempt_completion tool to summarize findings.</description>
                <action>Summarize the result and provide a demo command if applicable.</action>
            </step>
        </plan>
        <tool_use>
            <list_files>
                <path>project_directory</path>
                <recursive>true</recursive>
            </list_files>
        </tool_use>
    </example>

    <example>
        <task>Create a new configuration file for a web application.</task>
        <plan>
            <step>
                <description>Determine the required file structure and content for the configuration file.</description>
                <action>Use the write_to_file tool to create the configuration file based on findings.</action>
            </step>
            <step>
                <description>Confirm file creation success with the user.</description>
                <action>Wait for user confirmation before proceeding.</action>
            </step>
            <step>
                <description>Use the attempt_completion tool to present the final result.</description>
                <action>Summarize the result and provide a demo command if applicable.</action>
            </step>
        </plan>
        <tool_use>
            <write_to_file>
                <path>config/app.json</path>
                <content>
                {
                  "apiEndpoint": "https://api.example.com",
                  "features": {
                      "darkMode": true,
                      "analytics": false
                  }
                }
                </content>
            </write_to_file>
        </tool_use>
    </example>
</examples>`
    logPrompt(systemPrompt)
    return systemPrompt
}
