import * as deepl from "deepl-node";

const translator = new deepl.Translator(process.env.DEEPL_API_KEY!);

export const translateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> => {
  const result = await translator.translateText(
    text,
    sourceLanguage as deepl.SourceLanguageCode | null ?? null,
    targetLanguage as deepl.TargetLanguageCode
  );

  return result.text;
};

// Fetch all supported languages from DeepL
export const getSupportedLanguages = async () => {
  const sourceLanguages = await translator.getSourceLanguages();
  const targetLanguages = await translator.getTargetLanguages();

  return { sourceLanguages, targetLanguages };
};