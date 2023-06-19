export function shortenText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  const shortenedText = text.slice(0, maxLength - 3) + "...";
  return shortenedText;
}
