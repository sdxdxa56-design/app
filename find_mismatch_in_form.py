path = "src/components/AdminPortalModal.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

sub_lines = lines[2024:2195] # 2025 to 2195 (0-indexed 2024 is line 2025)

# Let's count HTML tags and braces in this range
text = "".join(sub_lines)

# Remove strings
text = re_clean = text
import re
text = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '""', text)
text = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", "''", text)
text = re.sub(r'`[^`\\]*(?:\\.[`\\]*)*`', "``", text, flags=re.DOTALL)

# Now count open/close curlies
open_c = 0
close_c = 0
open_p = 0
close_p = 0

for line_offset, line in enumerate(sub_lines):
    line_num = 2025 + line_offset
    for char in line:
        if char == '{': open_c += 1
        elif char == '}': close_c += 1
        elif char == '(': open_p += 1
        elif char == ')': close_p += 1
    # print(f"{line_num}: {open_c} / {close_c} | {line.strip()}")

print(f"Curlies: open={open_c}, close={close_c} (diff={open_c - close_c})")
print(f"Parens: open={open_p}, close={close_p} (diff={open_p - open_p})")
