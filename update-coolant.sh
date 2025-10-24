#!/bin/bash
# Update Unit 1 coolant
sed -i "148s/11\.1 gal × \$15\.00 × 1\.5 markup = \$249\.75/11.1 gal × \$20.00 × 1.5 markup = \$333.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "150s/\$1,500\.00 + \$249\.75 = \$1,749\.75/\$1,500.00 + \$333.00 = \$1,833.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "151s/\$1,749\.75 \/ 2 = \*\*\$874\.88\*\*/\$1,833.00 \/ 2 = **\$916.50**/" FTB_MANUAL_CALCULATIONS.md
sed -i "171s/\$874\.88/\$916.50/" FTB_MANUAL_CALCULATIONS.md
sed -i "174s/\*\*\$13,909\.55\*\*/\*\*\$13,951.17\*\*/" FTB_MANUAL_CALCULATIONS.md

# Update Unit 2 coolant
sed -i "228s/42\.5 gal × \$15\.00 × 1\.5 markup = \$956\.25/42.5 gal × \$20.00 × 1.5 markup = \$1,275.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "230s/\$2,000\.00 + \$956\.25 = \$2,956\.25/\$2,000.00 + \$1,275.00 = \$3,275.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "231s/\$2,956\.25 \/ 2 = \*\*\$1,478\.13\*\*/\$3,275.00 \/ 2 = **\$1,637.50**/" FTB_MANUAL_CALCULATIONS.md
sed -i "251s/\$1,478\.13/\$1,637.50/" FTB_MANUAL_CALCULATIONS.md
sed -i "254s/\*\*\$19,867\.13\*\*/\*\*\$20,026.50\*\*/" FTB_MANUAL_CALCULATIONS.md

# Update Unit 3 coolant  
sed -i "308s/164\.0 gal × \$15\.00 × 1\.5 markup = \$3,690\.00/164.0 gal × \$20.00 × 1.5 markup = \$4,920.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "310s/\$2,000\.00 + \$3,690\.00 = \$5,690\.00/\$2,000.00 + \$4,920.00 = \$6,920.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "311s/\$5,690\.00 \/ 2 = \*\*\$2,845\.00\*\*/\$6,920.00 \/ 2 = **\$3,460.00**/" FTB_MANUAL_CALCULATIONS.md
sed -i "331s/\$2,845\.00/\$3,460.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "334s/\*\*\$22,633\.20\*\*/\*\*\$23,248.20\*\*/" FTB_MANUAL_CALCULATIONS.md

# Update Unit 4 coolant
sed -i "388s/22\.2 gal × \$15\.00 × 1\.5 markup = \$499\.50/22.2 gal × \$20.00 × 1.5 markup = \$666.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "390s/\$1,750\.00 + \$499\.50 = \$2,249\.50/\$1,750.00 + \$666.00 = \$2,416.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "391s/\$2,249\.50 \/ 2 = \*\*\$1,124\.75\*\*/\$2,416.00 \/ 2 = **\$1,208.00**/" FTB_MANUAL_CALCULATIONS.md
sed -i "411s/\$1,124\.75/\$1,208.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "414s/\*\*\$16,973\.80\*\*/\*\*\$17,057.05\*\*/" FTB_MANUAL_CALCULATIONS.md

# Update Unit 5 coolant
sed -i "468s/42\.5 gal × \$15\.00 × 1\.5 markup = \$956\.25/42.5 gal × \$20.00 × 1.5 markup = \$1,275.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "470s/\$2,000\.00 + \$956\.25 = \$2,956\.25/\$2,000.00 + \$1,275.00 = \$3,275.00/" FTB_MANUAL_CALCULATIONS.md
sed -i "471s/\$2,956\.25 \/ 2 = \*\*\$1,478\.13\*\*/\$3,275.00 \/ 2 = **\$1,637.50**/" FTB_MANUAL_CALCULATIONS.md
sed -i "491s/\$1,478\.13/\$1,637.50/" FTB_MANUAL_CALCULATIONS.md
sed -i "494s/\*\*\$19,867\.13\*\*/\*\*\$20,026.50\*\*/" FTB_MANUAL_CALCULATIONS.md

# Update grand total table
sed -i "502s/\$13,909\.55/\$13,951.17/" FTB_MANUAL_CALCULATIONS.md
sed -i "503s/\$19,867\.13/\$20,026.50/" FTB_MANUAL_CALCULATIONS.md
sed -i "504s/\$22,633\.20/\$23,248.20/" FTB_MANUAL_CALCULATIONS.md
sed -i "505s/\$16,973\.80/\$17,057.05/" FTB_MANUAL_CALCULATIONS.md
sed -i "506s/\$19,867\.13/\$20,026.50/" FTB_MANUAL_CALCULATIONS.md
sed -i "507s/\$93,250\.81/\$94,309.42/" FTB_MANUAL_CALCULATIONS.md

# Update service breakdown
sed -i "514s/\$7,800\.89/\$8,859.50/" FTB_MANUAL_CALCULATIONS.md
sed -i "514s/8\.4%/9.4%/" FTB_MANUAL_CALCULATIONS.md

# Update summary
sed -i "524s/\$93,250\.81/\$94,309.42/" FTB_MANUAL_CALCULATIONS.md

echo "✅ All coolant costs updated to \$20/gal"
