// Import tool definitions
import accessMcpResource from './access_mcp_resource.json';
import askFollowupQuestion from './ask_followup_question.json';
import attemptCompletion from './attempt_completion.json';
import browserAction from './browser_action.json';
import executeCommand from './execute_command.json';
import listCodeDefinitionNames from './list_code_definition_names.json';
import listFiles from './list_files.json';
import readFile from './read_file.json';
import searchFiles from './search_files.json';
import useMcpTool from './use_mcp_tool.json';
import writeToFile from './write_to_file.json';

interface ToolParameter {
    name: string;
    description: string;
}

export const json2xml = (json: any): string => {
    const xml = (obj: any): string => {
        let result = '';
        for (const prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                const value = obj[prop];
                result += `<tool>
                    <name>${obj.name}</name>
                    <description>
                        ${obj.description}
                    </description>
                    <parameters>
                        ${obj.parameters.map((param: ToolParameter) => 
                          `<parameter>${param.name}: ${param.description}</parameter>`
                        ).join('\n                    ')}
                    </parameters>
                    <usage>
                        ${Object.entries(obj.usage).map(([key, value]) => 
                          `<${key}>
                            ${typeof value === 'object' && value !== null ? Object.entries(value).map(([k, v]) => 
                              `<${k}>${typeof v === 'object' && v !== null ? Object.entries(v).map(([kk, vv]) => `<${kk}>${vv}</${kk}>`).join('\n                            ') : v}</${k}>`
                            ).join('\n                            ') : value}
                        </${key}>`
                        ).join('\n                    ')}
                    </usage>
                </tool>`;
            }
        }
        return result;
    };
    return xml(json);
};

// Tool definitions
export const toolDefinitions = [
    accessMcpResource,
    askFollowupQuestion,
    attemptCompletion,
    browserAction,
    executeCommand,
    listCodeDefinitionNames,
    listFiles,
    readFile,
    searchFiles,
    useMcpTool,
    writeToFile
].map(toolDef => json2xml(toolDef));
