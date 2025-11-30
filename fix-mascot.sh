#!/bin/bash
# Fix mascot file paths in index.html

# Remove escape characters and fix CSS link
sed -i 's|<link rel=\\"stylesheet\\" href=\\"mascot-styles.css\\">.*</head>|<link rel="stylesheet" href="mascot-styles.css">\n</head>|' index.html

# Remove escape characters and fix JS script
sed -i 's|<script src=\\"mascot.js\\"></script>.*</body>|<script src="mascot.js"></script>\n</body>|' index.html
