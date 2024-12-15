**Task Overview:** Before decomposing, take time to analyze the usage and functionality of the class or directory to understand its context and dependencies. The task is to decompose given files into multiple smaller files. Each resulting file should contain only one method, one data block (a group of related fields), or one event block to ensure self-containment and maintainability. The goal is to avoid AI truncation while preserving logical organization.

**File Structure:** Files will be organized as follows:

- **Method Files:** Named as `Class.MethodName`, each containing a single function.
- **Data Block Files:** Named as `Class.Data`, containing a group of related fields or properties.
- **Property Files:** Named as `Class.PropertyName`, each containing a single property definition.
- **Event Block Files:** Named as `Class.EventName`, containing a group of related events.

**Content Guidelines:**

- Do not hesitate to create many small files if necessary. Smaller, focused files improve maintainability and clarity.
- Ensure each file contains only one logical unit (method, data block, or event block).
- Follow consistent naming conventions as specified.
- Maintain clarity and simplicity in each file.
- **Public Call Signatures:** Ensure that all public call signatures remain the same. If methods are moved from `Class` to `Class.Method`, forward the function reference as needed to avoid breaking existing references.

**Comments:** Keep comments minimal or omit them unless specified by the user.

