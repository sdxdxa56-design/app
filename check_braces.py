import sys
import re

path = "src/components/AdminPortalModal.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's clean up regexes, strings, and comments so they don't interfere.
# Replace single line comments
content_clean = re.sub(r'//.*', '', content)
# Replace block comments
content_clean = re.sub(r'/\*.*?\*/', '', content_clean, flags=re.DOTALL)
# Replace string literals (simple heuristic: single and double quotes)
# (Be careful with regex slashes, but let's replace regexes first)
content_clean = re.sub(r'/[^/ ]+/[gimy]*', '', content_clean) # simple regex removal
content_clean = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '""', content_clean)
content_clean = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", "''", content_clean)
content_clean = re.sub(r'`[^`\\]*(?:\\.[`\\]*)*`', "``", content_clean, flags=re.DOTALL)

lines = content_clean.split('\n')

stack = []
for idx, line in enumerate(lines):
    line_num = idx + 1
    for char in line:
        if char == '{':
            stack.append(('{', line_num))
        elif char == '(':
            stack.append(('(', line_num))
        elif char == '}':
            if stack and stack[-1][0] == '{':
                stack.pop()
            else:
                print(f"Error: unmatched '}}' at line {line_num} (char in line: {line.strip()})")
                if stack:
                    print(f"  Last opened: {stack[-1]}")
        elif char == ')':
            if stack and stack[-1][0] == '(':
                stack.pop()
            else:
                print(f"Error: unmatched ')' at line {line_num} (char in line: {line.strip()})")
                if stack:
                    print(f"  Last opened: {stack[-1]}")

print(f"Remaining stack size: {len(stack)}")
if stack:
    print("Unclosed structures:")
    for item in stack[-20:]:
        print(f"  {item[0]} opened at line {item[1]}")
