const fs = require('fs');

const snippets = fs.readFileSync('app_page_snippets.txt', 'utf8');

const startStr = 'The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n';
const endStr = '\nThe above content shows the entire, complete file contents of the requested file.';

const startIndex = snippets.indexOf(startStr);
const endIndex = snippets.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const block = snippets.substring(startIndex + startStr.length, endIndex);
  
  const originalLines = block.split('\n').map(line => {
    // Regex to match "123: " at start of line
    const match = line.match(/^(\d+): (.*)$/);
    if (match) {
      return match[2];
    } else if (line.match(/^(\d+):$/)) {
      return '';
    }
    return line;
  });

  fs.writeFileSync('d:\\My Work\\serenity\\app\\page.tsx', originalLines.join('\n'));
  console.log("Successfully recovered app/page.tsx");
} else {
  console.log("Could not find the block");
}
