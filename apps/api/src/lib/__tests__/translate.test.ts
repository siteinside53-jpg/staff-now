import { describe, expect, it } from 'vitest';
import { textHash, translateText } from '../translate';

/** Ψεύτικο Workers AI: καταγράφει τι ζητήθηκε και απαντά όπως του πούμε. */
function fakeAi(handlers: Record<string, (input: any) => any>) {
  const calls: { model: string; input: any }[] = [];
  return {
    calls,
    run: async (model: string, input: any) => {
      calls.push({ model, input });
      const h = handlers[model];
      if (!h) throw new Error('no such model');
      return h(input);
    },
  };
}

describe('textHash', () => {
  it('αλλάζει όταν αλλάζει το κείμενο και μένει ίδιο για το ίδιο κείμενο', () => {
    expect(textHash('Ζητείται μάγειρας')).toBe(textHash('Ζητείται μάγειρας'));
    expect(textHash('Ζητείται μάγειρας')).not.toBe(textHash('Ζητείται μάγειρας!'));
  });
});

describe('translateText', () => {
  it('χρησιμοποιεί το μεταφραστικό μοντέλο με κωδικούς γλώσσας el → en', async () => {
    const ai = fakeAi({
      '@cf/meta/m2m100-1.2b': (i) => ({ translated_text: `EN(${i.text.length} chars)` }),
    });
    const out = await translateText(ai, 'Ζητείται μάγειρας');
    expect(out).toBe('EN(17 chars)');
    expect(ai.calls[0]?.input).toMatchObject({ source_lang: 'el', target_lang: 'en' });
  });

  it('κρατά τις παραγράφους και δεν μεταφράζει γραμμές χωρίς ελληνικά', async () => {
    const ai = fakeAi({
      '@cf/meta/m2m100-1.2b': (i) => ({ translated_text: 'Translated line' }),
    });
    const out = await translateText(ai, 'Πρώτη γραμμή\n\nBartender 1500€\nΤρίτη γραμμή');
    expect(out).toBe('Translated line\n\nBartender 1500€\nTranslated line');
    // Η αγγλική γραμμή δεν έφτασε ποτέ στο μοντέλο.
    expect(ai.calls.length).toBe(2);
  });

  it('πέφτει στο δεύτερο μοντέλο αν το πρώτο αποτύχει ή γυρίσει ελληνικά', async () => {
    const ai = fakeAi({
      '@cf/meta/m2m100-1.2b': () => ({ translated_text: 'Ακόμη ελληνικά' }),
      '@cf/meta/llama-3.1-8b-instruct': () => ({ response: 'Cook wanted' }),
    });
    expect(await translateText(ai, 'Ζητείται μάγειρας')).toBe('Cook wanted');
  });

  it('γυρίζει null (→ μένει το ελληνικό) όταν κανένα μοντέλο δεν απαντά', async () => {
    const ai = fakeAi({});
    expect(await translateText(ai, 'Ζητείται μάγειρας')).toBeNull();
  });
});
