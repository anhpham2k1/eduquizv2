const mammoth = require('mammoth');

function parseQuizText(text) {
  const cleanedText = text
    .replace(/\xa0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  const questionStartRegex = /^(?:(?:Câu\s+hỏi|Câu)\s*\d+|\d+)[\s.:\)\-]/i;
  const optionStartRegex = /^(\*?\s*[A-D])[\s.:\)\-]/i;

  const lines = cleanedText.split('\n');
  const questions = [];
  let currentQuestion = null;
  let currentOptions = [];
  let currentParsingTarget = null;

  lines.forEach((line) => {
    if (!line) return;

    if (questionStartRegex.test(line)) {
      if (currentQuestion && currentOptions.length > 0) {
        questions.push(finalizeQuestion(currentQuestion, currentOptions, questions.length + 1));
      }

      const content = line.replace(/^(?:(?:Câu\s+hỏi|Câu)\s*\d+|\d+)[\s.:\)\-]\s*/i, '').trim();
      currentQuestion = { content };
      currentOptions = [];
      currentParsingTarget = 'question';
      return;
    }

    if (optionStartRegex.test(line)) {
      const match = line.match(/^(\*?)\s*([A-D])[\s.:\)\-]\s*(.*)/i);
      if (match) {
        currentOptions.push({
          key: match[2].toUpperCase(),
          text: match[3].trim(),
          isCorrect: match[1] === '*',
        });
        currentParsingTarget = 'option';
      }
      return;
    }

    if (currentParsingTarget === 'question' && currentQuestion) {
      currentQuestion.content += '\n' + line;
      return;
    }

    if (currentParsingTarget === 'option' && currentOptions.length > 0) {
      currentOptions[currentOptions.length - 1].text += '\n' + line;
    }
  });

  if (currentQuestion && currentOptions.length > 0) {
    questions.push(finalizeQuestion(currentQuestion, currentOptions, questions.length + 1));
  }

  return questions;
}

function finalizeQuestion(question, options, no) {
  const correctOption = options.find((option) => option.isCorrect) || options[0];

  return {
    no,
    content: question.content || 'Câu hỏi không có nội dung',
    choices: options.map((option) => ({ key: option.key, text: option.text })),
    correctKey: correctOption ? correctOption.key : 'A',
  };
}

async function processDocxBuffer(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  if (!text || text.trim().length === 0) {
    throw new Error('Tệp tin rỗng.');
  }

  const parsedQuestions = parseQuizText(text);
  if (parsedQuestions.length === 0) {
    throw new Error('Không tìm thấy câu hỏi hợp lệ.');
  }

  return parsedQuestions;
}

async function processDocumentBuffer(buffer, filename = '') {
  const isTextFile = filename.toLowerCase().endsWith('.txt');
  const text = isTextFile
    ? buffer.toString('utf8')
    : (await mammoth.extractRawText({ buffer })).value;

  if (!text || text.trim().length === 0) {
    throw new Error('Tệp tin rỗng.');
  }

  const parsedQuestions = parseQuizText(text);
  if (parsedQuestions.length === 0) {
    throw new Error('Không tìm thấy câu hỏi hợp lệ.');
  }

  return parsedQuestions;
}

module.exports = { parseQuizText, processDocxBuffer, processDocumentBuffer };
