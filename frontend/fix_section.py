with open('integrated-ui.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines are 0-indexed, so line 3377 is index 3376
# Replace lines 3377-3383 (indices 3376-3382)
# Current state has duplicate/wrong error messages
# We need to fix:
# - Line 3377 (index 3376): wrong error message
# - Line 3381 (index 3380): duplicate allServiceElements query

# Replace line 3377 (index 3376) 
lines[3376] = '                                console.error(`❌ [PHASE 3] Could not find price element: ${elementId}`);\n'

# Write back
with open('integrated-ui.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed error message")
