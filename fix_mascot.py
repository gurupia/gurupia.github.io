import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix CSS link
content = re.sub(
    r'<link rel=\\"stylesheet\\" href=\\"mascot-styles\.css\\">`r`n</head>',
    '<link rel="stylesheet" href="mascot-styles.css">\r\n</head>',
    content
)

# Fix JS script
content = re.sub(
    r'<script src=\\"mascot\.js\\"></script>`r`n</body>',
    '<script src="mascot.js"></script>\r\n</body>',
    content
)

# Write back
with open('index.html', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Fixed!")
