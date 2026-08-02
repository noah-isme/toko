with open('src/app/(admin)/admin/flash-sales/[id]/edit/page.tsx', 'r') as f:
    content = f.read()

# Fix the double quotes in JSX text content - replace with HTML entity
old = 'Click "Add Product"'
new = 'Click "Add Product"'
if old in content:
    content = content.replace(old, new)
    print(f'Replaced: {repr(old)} -> {repr(new)}')
else:
    print(f'Not found: {repr(old)}')

with open('src/app/(admin)/admin/flash-sales/[id]/edit/page.tsx', 'w') as f:
    f.write(content)
print('Done')
