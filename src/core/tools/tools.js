"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolDefinitions = exports.json2xml = void 0;
// Import tool definitions
var access_mcp_resource_json_1 = require("./access_mcp_resource.json");
var ask_followup_question_json_1 = require("./ask_followup_question.json");
var attempt_completion_json_1 = require("./attempt_completion.json");
var browser_action_json_1 = require("./browser_action.json");
var execute_command_json_1 = require("./execute_command.json");
var list_code_definition_names_json_1 = require("./list_code_definition_names.json");
var list_files_json_1 = require("./list_files.json");
var read_file_json_1 = require("./read_file.json");
var search_files_json_1 = require("./search_files.json");
var use_mcp_tool_json_1 = require("./use_mcp_tool.json");
var json2xml = function (json) {
    var xml = function (obj) {
        var result = '';
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                var value = obj[prop];
                result += "<tool>\n                    <name>".concat(obj.name, "</name>\n                    <description>\n                        ").concat(obj.description, "\n                    </description>\n                    <parameters>\n                        ").concat(obj.parameters.map(function (param) {
                    return "<parameter>".concat(param.name, ": ").concat(param.description, "</parameter>");
                }).join('\n                    '), "\n                    </parameters>\n                    <usage>\n                        ").concat(Object.entries(obj.usage).map(function (_a) {
                    var key = _a[0], value = _a[1];
                    return "<".concat(key, ">\n                            ").concat(typeof value === 'object' && value !== null ? Object.entries(value).map(function (_a) {
                        var k = _a[0], v = _a[1];
                        return "<".concat(k, ">").concat(typeof v === 'object' && v !== null ? Object.entries(v).map(function (_a) {
                            var kk = _a[0], vv = _a[1];
                            return "<".concat(kk, ">").concat(vv, "</").concat(kk, ">");
                        }).join('\n                            ') : v, "</").concat(k, ">");
                    }).join('\n                            ') : value, "\n                        </").concat(key, ">");
                }).join('\n                    '), "\n                    </usage>\n                </tool>");
            }
        }
        return result;
    };
    return xml(json);
};
exports.json2xml = json2xml;
// Tool definitions
exports.toolDefinitions = [
    access_mcp_resource_json_1.default,
    ask_followup_question_json_1.default,
    attempt_completion_json_1.default,
    browser_action_json_1.default,
    execute_command_json_1.default,
    list_code_definition_names_json_1.default,
    list_files_json_1.default,
    read_file_json_1.default,
    search_files_json_1.default,
    use_mcp_tool_json_1.default
].map(function (toolDef) { return (0, exports.json2xml)(toolDef); });
