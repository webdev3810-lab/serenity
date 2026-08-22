const fs = require('fs');

const transcriptPath = 'C:\\Users\\berna\\.gemini\\antigravity-ide\\brain\\39f3a60b-4abe-4185-a895-2f1076d8e4b1\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

let output = '';

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const step = JSON.parse(line);
    if (step.tool_calls) {
      for (const call of step.tool_calls) {
        if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
          if (call.args.TargetFile && call.args.TargetFile.includes('app/page.tsx')) {
            output += `\n--- TargetContent ---\n`;
            if (call.args.TargetContent) output += call.args.TargetContent + '\n';
            if (call.args.ReplacementChunks) {
               const chunks = typeof call.args.ReplacementChunks === 'string' ? JSON.parse(call.args.ReplacementChunks) : call.args.ReplacementChunks;
               chunks.forEach(c => output += c.TargetContent + '\n');
            }
          }
        }
      }
    }
    if (step.content && typeof step.content === 'string') {
       if (step.content.includes('File Path: `file:///d:/My%20Work/serenity/app/page.tsx`')) {
          output += `\n--- ViewFile output ---\n` + step.content + '\n';
       }
    }
  } catch (e) {}
}

fs.writeFileSync('d:\\My Work\\serenity\\app_page_snippets.txt', output);
console.log("Wrote snippets");
