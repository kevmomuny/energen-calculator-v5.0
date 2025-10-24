import re

# Read the file
with open('integrated-ui.html.backup2', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the malformed if-else blocks
# Replace the price element section
old_price = r'''                            const priceElement = document\.getElementById\(`\$\{unitId\}-service-\$\{serviceCode\}-price`\);
                            if \(priceElement && service\.totalCost != null\) \{
                                const previousContent = priceElement\.innerHTML;
                                priceElement\.innerHTML = `<span style="color: var\(--accent-electric\); font-weight: 600;">\$\$\{service\.totalCost\.toFixed\(2\)\}</span>`;
                                console\.log\(`✅ \[PHASE 3\] Updated price element for service \$\{serviceCode\}`\);
                                console\.log\(`   Previous content: \$\{previousContent\}`\);
                                console\.log\(`   New content: \$\$\{service\.totalCost\.toFixed\(2\)\}`\);
                            \} else \{
                            \} else \{
                                console\.error\(`❌ \[PHASE 3\] Service \$\{serviceCode\} has null/undefined totalCost:`, service\);
                                console\.error\(`❌ \[PHASE 3\] Could not find price element: \$\{elementId\}`\);
                                // Try to find all elements with similar IDs for debugging
                                const allServiceElements = document\.querySelectorAll\('\[id\*="-service-"\]\[id\*="-price"\]'\);
                                console\.log\(`\[PHASE 3\] All service price elements found:`, Array\.from\(allServiceElements\)\.map\(el => el\.id\)\);
                            \}'''

new_price = '''                            const priceElement = document.getElementById(`${unitId}-service-${serviceCode}-price`);
                            if (priceElement && service.totalCost != null) {
                                const previousContent = priceElement.innerHTML;
                                priceElement.innerHTML = `<span style="color: var(--accent-electric); font-weight: 600;">$${service.totalCost.toFixed(2)}</span>`;
                                console.log(`✅ [PHASE 3] Updated price element for service ${serviceCode}`);
                                console.log(`   Previous content: ${previousContent}`);
                                console.log(`   New content: $${service.totalCost.toFixed(2)}`);
                            } else if (!priceElement) {
                                console.error(`❌ [PHASE 3] Could not find price element: ${elementId}`);
                                // Try to find all elements with similar IDs for debugging
                                const allServiceElements = document.querySelectorAll('[id*="-service-"][id*="-price"]');
                                console.log(`[PHASE 3] All service price elements found:`, Array.from(allServiceElements).map(el => el.id));
                            } else {
                                console.error(`❌ [PHASE 3] Service ${serviceCode} has null/undefined totalCost:`, service);
                            }'''

content = re.sub(old_price, new_price, content)

# Fix the breakdown section
old_breakdown = r'''                            // Update breakdown display
                            const breakdownElement = document\.getElementById\(`\$\{unitId\}-service-\$\{serviceCode\}-breakdown`\);
                            if \(breakdownElement\) \{
                            \} else if \(breakdownElement\) \{
                                console\.error\(`❌ \[PHASE 3\] Service \$\{serviceCode\} has null/undefined laborCost or partsCost:`, service\);
                                breakdownElement\.textContent = `Labor: \$\$\{service\.laborCost\.toFixed\(2\)\} • Parts: \$\$\{service\.partsCost\.toFixed\(2\)\}`;
                            \}'''

new_breakdown = '''                            // Update breakdown display
                            const breakdownElement = document.getElementById(`${unitId}-service-${serviceCode}-breakdown`);
                            if (breakdownElement && service.laborCost != null && service.partsCost != null) {
                                breakdownElement.textContent = `Labor: $${service.laborCost.toFixed(2)} • Parts: $${service.partsCost.toFixed(2)}`;
                            } else if (breakdownElement) {
                                console.error(`❌ [PHASE 3] Service ${serviceCode} has null/undefined laborCost or partsCost:`, service);
                            }'''

content = re.sub(old_breakdown, new_breakdown, content)

# Write the fixed content
with open('integrated-ui.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed malformed code successfully")
