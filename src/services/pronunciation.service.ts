// Simple Levenshtein distance for word similarity
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function wordSimilarity(expected: string, actual: string): number {
  const distance = levenshteinDistance(expected.toLowerCase(), actual.toLowerCase());
  const maxLength = Math.max(expected.length, actual.length);
  return Math.max(0, 100 - (distance / maxLength) * 100);
}

export function calculatePronunciationScore(
  expectedText: string,
  actualTranscript: string,
  wordsTiming: Array<{ word: string; start: number; end: number }>
) {
  const expectedWords = expectedText.toLowerCase().split(/\s+/);
  const actualWords = actualTranscript.toLowerCase().split(/\s+/);

  const wordScores: Array<{ word: string; score: number; status: string }> = [];
  let totalScore = 0;

  expectedWords.forEach((expectedWord, index) => {
    const actualWord = actualWords[index] || '';
    const score = wordSimilarity(expectedWord, actualWord);

    let status = 'incorrect';
    if (score >= 85) status = 'correct';
    else if (score >= 60) status = 'close';

    wordScores.push({
      word: expectedWord,
      score: Math.round(score),
      status,
    });

    totalScore += score;
  });

  const overallScore = Math.round(totalScore / expectedWords.length);

  const missedWords = wordScores
    .filter((w) => w.status === 'incorrect')
    .map((w) => w.word);

  let feedback = 'جيد جداً! استمر في التدريب 👍';
  if (overallScore >= 90) feedback = 'ممتاز! نطقك رائع 🎉';
  else if (overallScore >= 75) feedback = 'جيد جداً! استمر في التدريب 👍';
  else if (overallScore >= 60) feedback = 'جيد! حاول التركيز أكثر على الكلمات الصعبة 💪';
  else feedback = 'استمر في المحاولة! التدريب يجعلك أفضل 🌟';

  return {
    transcript: actualTranscript,
    overallScore,
    wordScores,
    feedback,
    missedWords,
  };
}
