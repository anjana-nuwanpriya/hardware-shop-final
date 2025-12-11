#!/bin/bash

# QUOTATION MODULE - QUICK START FOR MAC
# Copy this entire script and run it in ~/hardware-shop directory

echo "🚀 Starting Quotation Module Setup..."
echo ""

# Step 1: Create directories
echo "📁 Creating directories..."
mkdir -p app/api/quotations/[id]/convert
mkdir -p app/sales/quotations/[id]/edit
mkdir -p app/sales/quotations/new
mkdir -p lib
echo "✅ Directories created"
echo ""

# Step 2: Copy files
echo "📋 Copying files from outputs..."
cp /mnt/user-data/outputs/setup_quotation_module.sh ./
cp /mnt/user-data/outputs/quotation_bash_commands.sh ./
chmod +x setup_quotation_module.sh
chmod +x quotation_bash_commands.sh
echo "✅ Setup scripts copied"
echo ""

# Step 3: Verify directories
echo "✔️ Verifying directory structure..."
if [ -d "app/api/quotations/[id]/convert" ]; then
    echo "✅ API directories OK"
else
    echo "❌ API directories missing"
fi

if [ -d "app/sales/quotations/[id]/edit" ]; then
    echo "✅ Sales directories OK"
else
    echo "❌ Sales directories missing"
fi
echo ""

# Step 4: Show summary
echo "════════════════════════════════════════════════════════════"
echo "               QUOTATION MODULE SETUP COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Files to be copied:"
echo "  • API Routes: 3 files (22.4 KiB)"
echo "  • Validation: 1 file (3.0 KiB)"
echo "  • UI Pages: 4 files (59.1 KiB)"
echo "  • Total: 8 files (84.5 KiB, 2,557 lines)"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Copy files from /mnt/user-data/outputs/"
echo "   Files ready: All 8 files"
echo ""
echo "2. Verify files:"
echo "   Run: ./quotation_bash_commands.sh"
echo ""
echo "3. Start dev server:"
echo "   Run: npm run dev"
echo ""
echo "4. Test API:"
echo "   curl http://localhost:3000/api/quotations"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Show file locations
echo "📍 File Locations:"
echo ""
ls -lh app/api/quotations/route.ts 2>/dev/null && echo "✅ API route.ts" || echo "⏳ API route.ts (copy needed)"
ls -lh app/api/quotations/[id]/route.ts 2>/dev/null && echo "✅ API [id]/route.ts" || echo "⏳ API [id]/route.ts (copy needed)"
ls -lh app/api/quotations/[id]/convert/route.ts 2>/dev/null && echo "✅ API [id]/convert/route.ts" || echo "⏳ API [id]/convert/route.ts (copy needed)"
ls -lh lib/validation-quotations.ts 2>/dev/null && echo "✅ Validation" || echo "⏳ Validation (copy needed)"
ls -lh app/sales/quotations/page.tsx 2>/dev/null && echo "✅ List page" || echo "⏳ List page (copy needed)"
ls -lh app/sales/quotations/new/page.tsx 2>/dev/null && echo "✅ Create page" || echo "⏳ Create page (copy needed)"
ls -lh app/sales/quotations/[id]/page.tsx 2>/dev/null && echo "✅ View page" || echo "⏳ View page (copy needed)"
ls -lh app/sales/quotations/[id]/edit/page.tsx 2>/dev/null && echo "✅ Edit page" || echo "⏳ Edit page (copy needed)"

echo ""
echo "Done! ✅"