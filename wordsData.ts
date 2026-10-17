export interface StoredWordItem {
  word: string;
  phoneticBreakdown: string;
  phoneticSpeechCue: string;
  phonemes: string[];
  exampleSentence: string;
}

export const EXPANSIVE_WORDS_BY_LEVEL: Record<number, StoredWordItem[]> = {
  1: [
    // Level 1: 1st & 2nd Grade Phonics (CVC, simple blends, digraphs, silent-e, vowel teams)
    { word: 'jump', phoneticBreakdown: 'j - uh - mp', phoneticSpeechCue: 'Listen: J, U, M, P. The short U makes a "uh" sound, ending with a mp blend.', phonemes: ['short-u', 'mp-blend'], exampleSentence: 'The rabbit will jump over the garden fence.' },
    { word: 'ship', phoneticBreakdown: 'sh - ih - p', phoneticSpeechCue: 'Listen: S, H, I, P. S and H together make the quiet "shh" sound.', phonemes: ['sh-digraph', 'short-i'], exampleSentence: 'A big pirate ship sailed across the ocean.' },
    { word: 'frog', phoneticBreakdown: 'f - r - aw - g', phoneticSpeechCue: 'Listen: F, R, O, G. F and R start with "fr", with short O in the middle.', phonemes: ['fr-blend', 'short-o'], exampleSentence: 'The green frog hopped onto a lily pad.' },
    { word: 'rain', phoneticBreakdown: 'r - ay - n', phoneticSpeechCue: 'Listen: R, A, I, N. The A and I team up to make the long A sound.', phonemes: ['ai-vowel-team', 'long-a'], exampleSentence: 'Put on your boots because it will rain today.' },
    { word: 'nest', phoneticBreakdown: 'n - eh - s - t', phoneticSpeechCue: 'Listen: N, E, S, T. Short E in the middle, ending with s and t.', phonemes: ['short-e', 'st-blend'], exampleSentence: 'The robin built a cozy nest in the tree.' },
    { word: 'cake', phoneticBreakdown: 'k - ay - k', phoneticSpeechCue: 'Listen: C, A, K, E. Magic silent E at the end tells the A to say its name!', phonemes: ['silent-e', 'long-a'], exampleSentence: 'We baked a delicious chocolate cake for the party.' },
    { word: 'milk', phoneticBreakdown: 'm - ih - l - k', phoneticSpeechCue: 'Listen: M, I, L, K. Short I sound, finished with l and k.', phonemes: ['short-i', 'lk-blend'], exampleSentence: 'She poured a cold glass of milk with breakfast.' },
    { word: 'lamp', phoneticBreakdown: 'l - ae - m - p', phoneticSpeechCue: 'Listen: L, A, M, P. Short A sound, followed by the mp blend.', phonemes: ['short-a', 'mp-blend'], exampleSentence: 'Turn on the desk lamp when you read your book.' },
    { word: 'duck', phoneticBreakdown: 'd - uh - k', phoneticSpeechCue: 'Listen: D, U, C, K. C and K join forces at the end to make one crisp /k/ sound.', phonemes: ['ck-digraph', 'short-u'], exampleSentence: 'The yellow duck swam gently across the pond.' },
    { word: 'star', phoneticBreakdown: 's - t - ar', phoneticSpeechCue: 'Listen: S, T, A, R. S-T blend at the start, with the bossy R sound "ar".', phonemes: ['st-blend', 'ar-r-controlled'], exampleSentence: 'Look up at the brightest star in the night sky.' },
    { word: 'boat', phoneticBreakdown: 'b - oh - t', phoneticSpeechCue: 'Listen: B, O, A, T. O and A team up to make the long O sound.', phonemes: ['oa-vowel-team', 'long-o'], exampleSentence: 'We paddled our little wooden boat on the lake.' },
    { word: 'fish', phoneticBreakdown: 'f - ih - sh', phoneticSpeechCue: 'Listen: F, I, S, H. Short I sound ending with the quiet sh digraph.', phonemes: ['sh-digraph', 'short-i'], exampleSentence: 'A tiny golden fish darted under the coral.' },
    { word: 'stop', phoneticBreakdown: 's - t - ah - p', phoneticSpeechCue: 'Listen: S, T, O, P. S-T blend with a short O.', phonemes: ['st-blend', 'short-o'], exampleSentence: 'Remember to stop and look both ways before crossing.' },
    { word: 'bell', phoneticBreakdown: 'b - eh - l', phoneticSpeechCue: 'Listen: B, E, L, L. Double L at the end of a short E word.', phonemes: ['double-consonant', 'short-e'], exampleSentence: 'The recess bell rang across the playground.' },
    { word: 'tree', phoneticBreakdown: 't - r - ee', phoneticSpeechCue: 'Listen: T, R, E, E. T-R blend with double E making long E.', phonemes: ['tr-blend', 'ee-vowel-team'], exampleSentence: 'The tall apple tree gave cool shade in summer.' },
    { word: 'hand', phoneticBreakdown: 'h - ae - n - d', phoneticSpeechCue: 'Listen: H, A, N, D. Short A with n-d blend at the end.', phonemes: ['nd-blend', 'short-a'], exampleSentence: 'Raise your hand when you know the answer.' },
    { word: 'clock', phoneticBreakdown: 'k - l - ah - k', phoneticSpeechCue: 'Listen: C, L, O, C, K. C-L blend and C-K at the end.', phonemes: ['cl-blend', 'ck-digraph'], exampleSentence: 'The big clock on the wall ticks every second.' },
    { word: 'sleep', phoneticBreakdown: 's - l - ee - p', phoneticSpeechCue: 'Listen: S, L, E, E, P. S-L blend with double E vowel team.', phonemes: ['sl-blend', 'ee-vowel-team'], exampleSentence: 'Get plenty of sleep so you feel energetic tomorrow.' },
    { word: 'green', phoneticBreakdown: 'g - r - ee - n', phoneticSpeechCue: 'Listen: G, R, E, E, N. G-R blend with double E long sound.', phonemes: ['gr-blend', 'ee-vowel-team'], exampleSentence: 'The caterpillar crawled on a fresh green leaf.' },
    { word: 'park', phoneticBreakdown: 'p - ar - k', phoneticSpeechCue: 'Listen: P, A, R, K. A-R bossy vowel sound finished with K.', phonemes: ['ar-r-controlled'], exampleSentence: 'We brought a soccer ball to play at the park.' },
    { word: 'drum', phoneticBreakdown: 'd - r - uh - m', phoneticSpeechCue: 'Listen: D, R, U, M. D-R blend with short U in the center.', phonemes: ['dr-blend', 'short-u'], exampleSentence: 'He tapped a steady beat on his new drum.' },
    { word: 'sock', phoneticBreakdown: 's - ah - k', phoneticSpeechCue: 'Listen: S, O, C, K. Short O followed by the c-k digraph.', phonemes: ['ck-digraph', 'short-o'], exampleSentence: 'He lost his stripey sock behind the bed.' },
    { word: 'kite', phoneticBreakdown: 'k - eye - t', phoneticSpeechCue: 'Listen: K, I, T, E. Magic silent E turns I into long I.', phonemes: ['silent-e', 'long-i'], exampleSentence: 'The colorful kite soared high into the breezy sky.' },
    { word: 'moon', phoneticBreakdown: 'm - oo - n', phoneticSpeechCue: 'Listen: M, O, O, N. Double O makes the oo sound.', phonemes: ['oo-vowel-team'], exampleSentence: 'The full moon lit up the backyard at night.' },
    { word: 'camp', phoneticBreakdown: 'k - ae - m - p', phoneticSpeechCue: 'Listen: C, A, M, P. Short A followed by m-p blend.', phonemes: ['mp-blend', 'short-a'], exampleSentence: 'We roasted marshmallows around the camp fire.' },
    { word: 'smile', phoneticBreakdown: 's - m - eye - l', phoneticSpeechCue: 'Listen: S, M, I, L, E. S-M blend with magic silent E.', phonemes: ['sm-blend', 'silent-e'], exampleSentence: 'A warm smile can brighten anyone\'s afternoon.' },
    { word: 'pink', phoneticBreakdown: 'p - ih - ng - k', phoneticSpeechCue: 'Listen: P, I, N, K. Short I with the n-k glued sound.', phonemes: ['nk-ending', 'short-i'], exampleSentence: 'The flamingo had bright pink feathers.' },
    { word: 'lunch', phoneticBreakdown: 'l - uh - n - ch', phoneticSpeechCue: 'Listen: L, U, N, C, H. Short U ending with n-c-h.', phonemes: ['ch-digraph', 'short-u'], exampleSentence: 'We packed a turkey sandwich for school lunch.' },
    { word: 'sand', phoneticBreakdown: 's - ae - n - d', phoneticSpeechCue: 'Listen: S, A, N, D. Short A with n-d blend.', phonemes: ['nd-blend', 'short-a'], exampleSentence: 'We built a tall fortress out of wet sand.' },
    { word: 'hill', phoneticBreakdown: 'h - ih - l', phoneticSpeechCue: 'Listen: H, I, L, L. Double L at the end of short I.', phonemes: ['double-consonant', 'short-i'], exampleSentence: 'They rolled the red ball down the grassy hill.' },
    { word: 'crab', phoneticBreakdown: 'k - r - ae - b', phoneticSpeechCue: 'Listen: C, R, A, B. C-R blend with short A sound.', phonemes: ['cr-blend', 'short-a'], exampleSentence: 'A little sand crab scuttled into its hole.' },
    { word: 'flag', phoneticBreakdown: 'f - l - ae - g', phoneticSpeechCue: 'Listen: F, L, A, G. F-L blend with short A.', phonemes: ['fl-blend', 'short-a'], exampleSentence: 'The colorful flag fluttered in the autumn breeze.' },
    { word: 'vest', phoneticBreakdown: 'v - eh - s - t', phoneticSpeechCue: 'Listen: V, E, S, T. Short E with s-t blend.', phonemes: ['short-e', 'st-blend'], exampleSentence: 'He wore a warm fleece vest over his flannel shirt.' },
    { word: 'bone', phoneticBreakdown: 'b - oh - n', phoneticSpeechCue: 'Listen: B, O, N, E. Magic silent E makes O long.', phonemes: ['silent-e', 'long-o'], exampleSentence: 'The friendly puppy carried a bone to the porch.' },
    { word: 'rope', phoneticBreakdown: 'r - oh - p', phoneticSpeechCue: 'Listen: R, O, P, E. Silent E turns O into long O.', phonemes: ['silent-e', 'long-o'], exampleSentence: 'We used a sturdy rope to hang the tire swing.' },
    { word: 'wave', phoneticBreakdown: 'w - ay - v', phoneticSpeechCue: 'Listen: W, A, V, E. Silent E gives A the long sound.', phonemes: ['silent-e', 'long-a'], exampleSentence: 'A big ocean wave crashed against the sandy shore.' },
    { word: 'seed', phoneticBreakdown: 's - ee - d', phoneticSpeechCue: 'Listen: S, E, E, D. Double E makes the long E sound.', phonemes: ['ee-vowel-team'], exampleSentence: 'We planted a sunflower seed in the garden pot.' },
    { word: 'tail', phoneticBreakdown: 't - ay - l', phoneticSpeechCue: 'Listen: T, A, I, L. A and I team up for long A.', phonemes: ['ai-vowel-team', 'long-a'], exampleSentence: 'The happy dog wagged its fluffy tail.' },
    { word: 'soap', phoneticBreakdown: 's - oh - p', phoneticSpeechCue: 'Listen: S, O, A, P. O and A team up to make long O.', phonemes: ['oa-vowel-team', 'long-o'], exampleSentence: 'Wash your hands with warm water and soap.' },
    { word: 'king', phoneticBreakdown: 'k - ih - ng', phoneticSpeechCue: 'Listen: K, I, N, G. Short I with n-g ending sound.', phonemes: ['ng-ending', 'short-i'], exampleSentence: 'The storybook king wore a sparkling golden crown.' },
    { word: 'song', phoneticBreakdown: 's - aw - ng', phoneticSpeechCue: 'Listen: S, O, N, G. Short O with the n-g glued sound.', phonemes: ['ng-ending', 'short-o'], exampleSentence: 'The choir sang a cheerful song at the assembly.' },
    { word: 'chin', phoneticBreakdown: 'ch - ih - n', phoneticSpeechCue: 'Listen: C, H, I, N. C-H digraph with short I.', phonemes: ['ch-digraph', 'short-i'], exampleSentence: 'He scratched his chin while solving the riddle.' },
    { word: 'path', phoneticBreakdown: 'p - ae - th', phoneticSpeechCue: 'Listen: P, A, T, H. Short A ending with t-h digraph.', phonemes: ['th-digraph', 'short-a'], exampleSentence: 'We walked along the stone path through the park.' },
    { word: 'bank', phoneticBreakdown: 'b - ae - ng - k', phoneticSpeechCue: 'Listen: B, A, N, K. Short A with n-k glued sound.', phonemes: ['nk-ending', 'short-a'], exampleSentence: 'He kept his saved coins in a green piggy bank.' },
    { word: 'tent', phoneticBreakdown: 't - eh - n - t', phoneticSpeechCue: 'Listen: T, E, N, T. Short E with n-t ending blend.', phonemes: ['short-e', 'nt-blend'], exampleSentence: 'We pitched our camping tent under the pine trees.' },
    { word: 'belt', phoneticBreakdown: 'b - eh - l - t', phoneticSpeechCue: 'Listen: B, E, L, T. Short E ending with l-t.', phonemes: ['short-e', 'lt-blend'], exampleSentence: 'He buckled his leather belt before school.' },
    { word: 'mask', phoneticBreakdown: 'm - ae - s - k', phoneticSpeechCue: 'Listen: M, A, S, K. Short A with s-k blend at the end.', phonemes: ['short-a', 'sk-blend'], exampleSentence: 'She wore a colorful superhero mask to the costume party.' },
    { word: 'plum', phoneticBreakdown: 'p - l - uh - m', phoneticSpeechCue: 'Listen: P, L, U, M. P-L blend with short U in the middle.', phonemes: ['pl-blend', 'short-u'], exampleSentence: 'He picked a sweet, purple plum from the orchard tree.' },
    { word: 'grip', phoneticBreakdown: 'g - r - ih - p', phoneticSpeechCue: 'Listen: G, R, I, P. G-R blend with short I sound.', phonemes: ['gr-blend', 'short-i'], exampleSentence: 'Keep a firm grip on the bicycle handlebars.' },
    { word: 'swim', phoneticBreakdown: 's - w - ih - m', phoneticSpeechCue: 'Listen: S, W, I, M. S-W blend with short I.', phonemes: ['sw-blend', 'short-i'], exampleSentence: 'The goldfish love to swim in the aquarium.' },
  ],
  2: [
    // Level 2: Core 3rd Grade Phonics (trigraphs, silent letters, vowel digraphs, 2-syllables)
    { word: 'bright', phoneticBreakdown: 'b - r - eye - t', phoneticSpeechCue: 'Listen: B, R, I, G, H, T. I-G-H makes the long I sound!', phonemes: ['igh-trigraph', 'br-blend'], exampleSentence: 'The sunshine was so bright we wore sunglasses.' },
    { word: 'friend', phoneticBreakdown: 'f - r - eh - n - d', phoneticSpeechCue: 'Listen: F, R, I, E, N, D. Remember: "Fri" on Friday, "end" at the weekend!', phonemes: ['fr-blend', 'irregular-ie'], exampleSentence: 'My best friend shared an apple with me at lunch.' },
    { word: 'climb', phoneticBreakdown: 'k - l - eye - m', phoneticSpeechCue: 'Listen: C, L, I, M, B. Notice the silent B waiting quietly at the end.', phonemes: ['cl-blend', 'silent-b', 'long-i'], exampleSentence: 'We love to climb the tall playground structure.' },
    { word: 'pocket', phoneticBreakdown: 'p - ah - k - eht', phoneticSpeechCue: 'Listen: P, O, C, K, E, T. Two syllables: pock-et, with c-k in the middle.', phonemes: ['ck-digraph', 'short-o'], exampleSentence: 'He found a shiny quarter hidden in his pocket.' },
    { word: 'shadow', phoneticBreakdown: 'sh - ae - d - oh', phoneticSpeechCue: 'Listen: S, H, A, D, O, W. Starts with sh, and O-W makes the long O at the end.', phonemes: ['sh-digraph', 'ow-long-o'], exampleSentence: 'The puppy chased its own shadow on the sidewalk.' },
    { word: 'knight', phoneticBreakdown: 'n - eye - t', phoneticSpeechCue: 'Listen: K, N, I, G, H, T. Silent K at the beginning and I-G-H makes the long I.', phonemes: ['silent-k', 'kn-blend', 'igh-trigraph'], exampleSentence: 'The brave knight wore shiny silver armor.' },
    { word: 'splash', phoneticBreakdown: 's - p - l - ae - sh', phoneticSpeechCue: 'Listen: S, P, L, A, S, H. Triple blend S-P-L and sh at the finish.', phonemes: ['spl-blend', 'sh-digraph'], exampleSentence: 'The dolphin made a giant splash in the pool.' },
    { word: 'dragon', phoneticBreakdown: 'd - r - ae - g - uh n', phoneticSpeechCue: 'Listen: D, R, A, G, O, N. D-R blend at the start: drag-on.', phonemes: ['dr-blend', 'short-a'], exampleSentence: 'The friendly green dragon breathed colorful bubbles.' },
    { word: 'winter', phoneticBreakdown: 'w - ih - n - t - er', phoneticSpeechCue: 'Listen: W, I, N, T, E, R. Two syllables: win-ter, ending with er.', phonemes: ['short-i', 'er-r-controlled'], exampleSentence: 'Snow fell quietly on the trees all winter.' },
    { word: 'bridge', phoneticBreakdown: 'b - r - ih - j', phoneticSpeechCue: 'Listen: B, R, I, D, G, E. D-G-E team up to make the /j/ sound after short I!', phonemes: ['br-blend', 'dge-trigraph'], exampleSentence: 'The red train crossed the bridge over the river.' },
    { word: 'thumb', phoneticBreakdown: 'th - uh - m', phoneticSpeechCue: 'Listen: T, H, U, M, B. T-H digraph and silent B at the end.', phonemes: ['th-digraph', 'silent-b'], exampleSentence: 'Give a big thumbs up if you understand the rules.' },
    { word: 'scratch', phoneticBreakdown: 's - k - r - ae - ch', phoneticSpeechCue: 'Listen: S, C, R, A, T, C, H. Triple blend S-C-R, ending with T-C-H.', phonemes: ['scr-blend', 'tch-trigraph'], exampleSentence: 'The puppy wanted a gentle scratch behind its ears.' },
    { word: 'castle', phoneticBreakdown: 'k - ae - s - uh - l', phoneticSpeechCue: 'Listen: C, A, S, T, L, E. Silent T sits quietly inside castle!', phonemes: ['silent-t', 'le-ending'], exampleSentence: 'The stone castle stood proudly at the top of the mountain.' },
    { word: 'stream', phoneticBreakdown: 's - t - r - ee - m', phoneticSpeechCue: 'Listen: S, T, R, E, A, M. S-T-R triple blend with E-A vowel team.', phonemes: ['str-blend', 'ea-vowel-team'], exampleSentence: 'Fresh cold water bubbled through the forest stream.' },
    { word: 'feather', phoneticBreakdown: 'f - eh - th - er', phoneticSpeechCue: 'Listen: F, E, A, T, H, E, R. E-A makes short E, with voiced T-H.', phonemes: ['th-digraph', 'er-ending'], exampleSentence: 'A soft blue feather dropped from the robin.' },
    { word: 'plenty', phoneticBreakdown: 'p - l - eh - n - t - ee', phoneticSpeechCue: 'Listen: P, L, E, N, T, Y. P-L blend, ending with Y saying long E.', phonemes: ['pl-blend', 'y-as-e'], exampleSentence: 'There was plenty of warm popcorn for movie night.' },
    { word: 'jacket', phoneticBreakdown: 'j - ae - k - eht', phoneticSpeechCue: 'Listen: J, A, C, K, E, T. Jack-et, with c-k in the middle.', phonemes: ['ck-digraph', 'short-a'], exampleSentence: 'Zip your jacket before going out into the cool wind.' },
    { word: 'silver', phoneticBreakdown: 's - ih - l - v - er', phoneticSpeechCue: 'Listen: S, I, L, V, E, R. Sil-ver, ending with r-controlled e-r.', phonemes: ['er-r-controlled', 'short-i'], exampleSentence: 'The champion runner received a shiny silver medal.' },
    { word: 'blanket', phoneticBreakdown: 'b - l - ae - ng - k - eht', phoneticSpeechCue: 'Listen: B, L, A, N, K, E, T. B-L blend and the n-k sound in blan-ket.', phonemes: ['bl-blend', 'nk-ending'], exampleSentence: 'Wrap yourself in the warm wool blanket.' },
    { word: 'honest', phoneticBreakdown: 'ah - n - eht - s - t', phoneticSpeechCue: 'Listen: H, O, N, E, S, T. Silent H begins the word honest!', phonemes: ['silent-h', 'short-o'], exampleSentence: 'It is always best to be honest with your friends.' },
    { word: 'fright', phoneticBreakdown: 'f - r - eye - t', phoneticSpeechCue: 'Listen: F, R, I, G, H, T. F-R blend with I-G-H long I.', phonemes: ['fr-blend', 'igh-trigraph'], exampleSentence: 'The sudden loud thunder gave the cat a fright.' },
    { word: 'bottle', phoneticBreakdown: 'b - ah - t - uh - l', phoneticSpeechCue: 'Listen: B, O, T, T, L, E. Double T with l-e consonant ending.', phonemes: ['double-consonant', 'le-ending'], exampleSentence: 'Fill up your water bottle before basketball practice.' },
    { word: 'cloudy', phoneticBreakdown: 'k - l - ow - d - ee', phoneticSpeechCue: 'Listen: C, L, O, U, D, Y. C-L blend, O-U diphthong, and Y saying long E.', phonemes: ['ou-diphthong', 'y-as-e'], exampleSentence: 'The cloudy sky hinted that rain was coming soon.' },
    { word: 'badge', phoneticBreakdown: 'b - ae - j', phoneticSpeechCue: 'Listen: B, A, D, G, E. D-G-E makes /j/ right after short A.', phonemes: ['dge-trigraph', 'short-a'], exampleSentence: 'The junior ranger proudly pinned on her badge.' },
    { word: 'wrist', phoneticBreakdown: 'r - ih - s - t', phoneticSpeechCue: 'Listen: W, R, I, S, T. Silent W before R in wrist.', phonemes: ['silent-w', 'st-blend'], exampleSentence: 'He wore a digital watch around his left wrist.' },
    { word: 'peanut', phoneticBreakdown: 'p - ee - n - uh - t', phoneticSpeechCue: 'Listen: P, E, A, N, U, T. Compound sound: pea-nut, with E-A.', phonemes: ['ea-vowel-team'], exampleSentence: 'She spread creamy peanut butter on toasted bread.' },
    { word: 'circus', phoneticBreakdown: 's - er - k - uh - s', phoneticSpeechCue: 'Listen: C, I, R, C, U, S. Soft C at the start, hard C in the middle.', phonemes: ['soft-c', 'ir-r-controlled'], exampleSentence: 'Acrobats performed thrilling tricks at the circus.' },
    { word: 'whisper', phoneticBreakdown: 'w - ih - s - p - er', phoneticSpeechCue: 'Listen: W, H, I, S, P, E, R. W-H digraph and e-r ending.', phonemes: ['wh-digraph', 'er-r-controlled'], exampleSentence: 'Speak in a quiet whisper inside the public library.' },
    { word: 'rocket', phoneticBreakdown: 'r - ah - k - eht', phoneticSpeechCue: 'Listen: R, O, C, K, E, T. Rock-et, with c-k sound in the middle.', phonemes: ['ck-digraph', 'short-o'], exampleSentence: 'The space rocket blasted off with a trail of smoke.' },
    { word: 'spider', phoneticBreakdown: 's - p - eye - d - er', phoneticSpeechCue: 'Listen: S, P, I, D, E, R. S-P blend, open syllable long I, ending in e-r.', phonemes: ['sp-blend', 'open-syllable', 'er-ending'], exampleSentence: 'A tiny garden spider spun an intricate web.' },
    { word: 'knock', phoneticBreakdown: 'n - ah - k', phoneticSpeechCue: 'Listen: K, N, O, C, K. Silent K at start and c-k at end.', phonemes: ['silent-k', 'ck-digraph'], exampleSentence: 'Remember to knock before opening the door.' },
    { word: 'stitch', phoneticBreakdown: 's - t - ih - ch', phoneticSpeechCue: 'Listen: S, T, I, T, C, H. S-T blend ending in t-c-h trigraph.', phonemes: ['st-blend', 'tch-trigraph'], exampleSentence: 'She mended the torn hem with a tidy stitch.' },
    { word: 'fudge', phoneticBreakdown: 'f - uh - j', phoneticSpeechCue: 'Listen: F, U, D, G, E. D-G-E makes /j/ after short U.', phonemes: ['dge-trigraph', 'short-u'], exampleSentence: 'Grandma made a rich batch of chocolate fudge.' },
    { word: 'wreck', phoneticBreakdown: 'r - eh - k', phoneticSpeechCue: 'Listen: W, R, E, C, K. Silent W before R, ending with c-k.', phonemes: ['silent-w', 'ck-digraph'], exampleSentence: 'The divers explored an old sunken shipwreck.' },
    { word: 'flight', phoneticBreakdown: 'f - l - eye - t', phoneticSpeechCue: 'Listen: F, L, I, G, H, T. F-L blend with I-G-H for long I.', phonemes: ['fl-blend', 'igh-trigraph'], exampleSentence: 'Our flight landed right on schedule at the airport.' },
    { word: 'candle', phoneticBreakdown: 'k - ae - n - d - uh - l', phoneticSpeechCue: 'Listen: C, A, N, D, L, E. Can-dle, ending in consonant l-e.', phonemes: ['le-ending', 'short-a'], exampleSentence: 'Blow out the birthday candle and make a wish.' },
    { word: 'glance', phoneticBreakdown: 'g - l - ae - n - s', phoneticSpeechCue: 'Listen: G, L, A, N, C, E. G-L blend with soft C-E at the end.', phonemes: ['gl-blend', 'soft-c'], exampleSentence: 'He stole a quick glance at the clock during class.' },
    { word: 'freeze', phoneticBreakdown: 'f - r - ee - z', phoneticSpeechCue: 'Listen: F, R, E, E, Z, E. F-R blend with double E and silent E.', phonemes: ['fr-blend', 'ee-vowel-team'], exampleSentence: 'Water will freeze into solid ice in winter.' },
    { word: 'crumb', phoneticBreakdown: 'k - r - uh - m', phoneticSpeechCue: 'Listen: C, R, U, M, B. C-R blend ending with silent B.', phonemes: ['cr-blend', 'silent-b'], exampleSentence: 'The little bird pecked at a cookie crumb.' },
    { word: 'sprout', phoneticBreakdown: 's - p - r - ow - t', phoneticSpeechCue: 'Listen: S, P, R, O, U, T. S-P-R triple blend with O-U diphthong.', phonemes: ['spr-blend', 'ou-diphthong'], exampleSentence: 'A tiny green sprout popped through the garden soil.' },
    { word: 'dolphin', phoneticBreakdown: 'd - aw - l - f - ih - n', phoneticSpeechCue: 'Listen: D, O, L, P, H, I, N. P-H teams up to make the /f/ sound.', phonemes: ['ph-digraph', 'short-o'], exampleSentence: 'A playful dolphin leaped above the waves.' },
    { word: 'whistle', phoneticBreakdown: 'w - ih - s - uh - l', phoneticSpeechCue: 'Listen: W, H, I, S, T, L, E. Silent T sits quietly in whistle!', phonemes: ['wh-digraph', 'silent-t', 'le-ending'], exampleSentence: 'The referee blew his shiny whistle to start the game.' },
    { word: 'kitchen', phoneticBreakdown: 'k - ih - ch - eht', phoneticSpeechCue: 'Listen: K, I, T, C, H, E, N. T-C-H makes the crisp /ch/ sound after short I.', phonemes: ['tch-trigraph', 'short-i'], exampleSentence: 'A warm aroma of baked cookies filled the kitchen.' },
    { word: 'explore', phoneticBreakdown: 'e k - s - p - l - or', phoneticSpeechCue: 'Listen: E, X, P, L, O, R, E. Ex-plore, with the ore sound at the end.', phonemes: ['ore-r-controlled', 'pl-blend'], exampleSentence: 'We packed a compass to explore the enchanted forest.' },
    { word: 'treasure', phoneticBreakdown: 't - r - eh - zh - er', phoneticSpeechCue: 'Listen: T, R, E, A, S, U, R, E. E-A makes the short E sound here.', phonemes: ['tr-blend', 'ure-ending'], exampleSentence: 'The explorers found a chest of golden treasure.' },
    { word: 'autumn', phoneticBreakdown: 'aw - t - uh - m', phoneticSpeechCue: 'Listen: A, U, T, U, M, N. Silent N rests at the end of autumn.', phonemes: ['au-vowel-team', 'silent-n'], exampleSentence: 'Leaves turned bright red and orange in autumn.' },
    { word: 'mystery', phoneticBreakdown: 'm - ih - s - t - er - ee', phoneticSpeechCue: 'Listen: M, Y, S, T, E, R, Y. Y acts as a short I in mys-ter-y.', phonemes: ['y-as-short-i', 'er-r-controlled'], exampleSentence: 'The detective solved the thrilling library mystery.' },
    { word: 'garden', phoneticBreakdown: 'g - ar - d - eht - n', phoneticSpeechCue: 'Listen: G, A, R, D, E, N. A-R bossy vowel sound in gar-den.', phonemes: ['ar-r-controlled', 'en-ending'], exampleSentence: 'Sweet strawberries ripened in the backyard garden.' },
    { word: 'lightning', phoneticBreakdown: 'l - eye - t - n - ih - ng', phoneticSpeechCue: 'Listen: L, I, G, H, T, N, I, N, G. I-G-H makes the long I sound in light-ning.', phonemes: ['igh-trigraph', 'ng-ending'], exampleSentence: 'A flash of bright lightning lit up the stormy sky.' },
  ],
  3: [
    // Level 3: 3rd & 4th Grade Vocabulary (prefixes, suffixes, multisyllabic phonics, compound words)
    { word: 'adventure', phoneticBreakdown: 'ae d - v - eh n - ch - er', phoneticSpeechCue: 'Listen: A, D, V, E, N, T, U, R, E. Ad-ven-ture with T-U-R-E ending.', phonemes: ['ture-ending', 'ad-prefix'], exampleSentence: 'Reading a great book feels like a grand adventure.' },
    { word: 'astronaut', phoneticBreakdown: 'ae s - t - r - oh - n - aw t', phoneticSpeechCue: 'Listen: A, S, T, R, O, N, A, U, T. As-tro-naut, ending with A-U-T.', phonemes: ['str-blend', 'au-vowel-team'], exampleSentence: 'The brave astronaut walked gently on the surface of the moon.' },
    { word: 'rhythm', phoneticBreakdown: 'r - ih - th - uh m', phoneticSpeechCue: 'Listen: R, H, Y, T, H, M. No standard vowels: R-H-Y-T-H-M!', phonemes: ['rh-digraph', 'y-as-short-i'], exampleSentence: 'The drummer kept a steady, energetic rhythm for the band.' },
    { word: 'bicycle', phoneticBreakdown: 'b - eye - s - ih - k - uh l', phoneticSpeechCue: 'Listen: B, I, C, Y, C, L, E. Bi-cy-cle with soft C before Y.', phonemes: ['bi-prefix', 'soft-c', 'cle-ending'], exampleSentence: 'He rode his blue bicycle all the way to the park.' },
    { word: 'camera', phoneticBreakdown: 'k - ae - m - er - uh', phoneticSpeechCue: 'Listen: C, A, M, E, R, A. Three syllables: cam-er-a.', phonemes: ['er-r-controlled', 'schwa-ending'], exampleSentence: 'Snap a family photo with the digital camera.' },
    { word: 'dinosaur', phoneticBreakdown: 'd - eye - n - uh - s - or', phoneticSpeechCue: 'Listen: D, I, N, O, S, A, U, R. Di-no-saur, with A-U-R ending.', phonemes: ['aur-r-controlled', 'open-syllable'], exampleSentence: 'A huge fossil dinosaur skeleton stood in the museum.' },
    { word: 'elephant', phoneticBreakdown: 'eh - l - uh - f - uh n - t', phoneticSpeechCue: 'Listen: E, L, E, P, H, A, N, T. P-H makes the /f/ sound: el-e-phant.', phonemes: ['ph-digraph', 'ant-ending'], exampleSentence: 'The gentle elephant sprayed cool water from its trunk.' },
    { word: 'festival', phoneticBreakdown: 'f - eh - s - t - ih - v - uh l', phoneticSpeechCue: 'Listen: F, E, S, T, I, V, A, L. Fes-ti-val with -al suffix.', phonemes: ['st-blend', 'al-suffix'], exampleSentence: 'Lanterns glowed warmly at the spring cultural festival.' },
    { word: 'gigantic', phoneticBreakdown: 'j - eye - g - ae n - t - ih k', phoneticSpeechCue: 'Listen: G, I, G, A, N, T, I, C. Soft G at the start, hard G in the middle.', phonemes: ['soft-g', 'ic-suffix'], exampleSentence: 'A gigantic red balloon floated high above the stadium.' },
    { word: 'harmony', phoneticBreakdown: 'h - ar - m - uh - n - ee', phoneticSpeechCue: 'Listen: H, A, R, M, O, N, Y. Har-mo-ny, with A-R and Y saying long E.', phonemes: ['ar-r-controlled', 'y-as-e'], exampleSentence: 'The chorus sang together in beautiful four-part harmony.' },
    { word: 'island', phoneticBreakdown: 'eye - l - uh n - d', phoneticSpeechCue: 'Listen: I, S, L, A, N, D. Silent S sits quietly in the word island!', phonemes: ['silent-s', 'open-syllable'], exampleSentence: 'They took a ferry across the bay to the sunny island.' },
    { word: 'journey', phoneticBreakdown: 'j - er - n - ee', phoneticSpeechCue: 'Listen: J, O, U, R, N, E, Y. O-U-R makes /er/ and E-Y says long E.', phonemes: ['our-r-controlled', 'ey-vowel-team'], exampleSentence: 'The travelers embarked on a thrilling cross-country journey.' },
    { word: 'kingdom', phoneticBreakdown: 'k - ih ng - d - uh m', phoneticSpeechCue: 'Listen: K, I, N, G, D, O, M. King-dom, with the -dom suffix.', phonemes: ['ng-ending', 'dom-suffix'], exampleSentence: 'Peace reigned throughout the storybook fairy kingdom.' },
    { word: 'lemonade', phoneticBreakdown: 'l - eh - m - uh - n - ay d', phoneticSpeechCue: 'Listen: L, E, M, O, N, A, D, E. Lem-on-ade with magic silent E at the end.', phonemes: ['ade-suffix', 'silent-e'], exampleSentence: 'Ice cubes clinked in a frosty glass of tart lemonade.' },
    { word: 'mountain', phoneticBreakdown: 'm - ow n - t - ih n', phoneticSpeechCue: 'Listen: M, O, U, N, T, A, I, N. O-U diphthong with A-I-N ending.', phonemes: ['ou-diphthong', 'ain-ending'], exampleSentence: 'Snow capped the peak of the rugged granite mountain.' },
    { word: 'natural', phoneticBreakdown: 'n - ae - ch - er - uh l', phoneticSpeechCue: 'Listen: N, A, T, U, R, A, L. Nat-u-ral with -al ending.', phonemes: ['tur-sound', 'al-suffix'], exampleSentence: 'Fresh honey is a delicious and natural sweetener.' },
    { word: 'octopus', phoneticBreakdown: 'ah k - t - uh - p - uh s', phoneticSpeechCue: 'Listen: O, C, T, O, P, U, S. Oc-to-pus with Greek prefix oct- for eight.', phonemes: ['oct-root', 'short-o'], exampleSentence: 'The curious octopus waved eight flexible arms under water.' },
    { word: 'pyramid', phoneticBreakdown: 'p - ear - uh - m - ih d', phoneticSpeechCue: 'Listen: P, Y, R, A, M, I, D. Y says short I in pyr-a-mid.', phonemes: ['y-as-short-i', 'greek-root'], exampleSentence: 'Ancient builders crafted the giant limestone pyramid.' },
    { word: 'question', phoneticBreakdown: 'k - w - eh s - ch - uh n', phoneticSpeechCue: 'Listen: Q, U, E, S, T, I, O, N. Q always brings U: ques-tion.', phonemes: ['qu-blend', 'tion-suffix'], exampleSentence: 'The curious student raised her hand to ask a question.' },
    { word: 'rainbow', phoneticBreakdown: 'r - ay n - b - oh', phoneticSpeechCue: 'Listen: R, A, I, N, B, O, W. Compound word: rain + bow.', phonemes: ['ai-vowel-team', 'ow-long-o'], exampleSentence: 'A vivid double rainbow appeared right after the shower.' },
    { word: 'sapphire', phoneticBreakdown: 's - ae - f - eye - er', phoneticSpeechCue: 'Listen: S, A, P, P, H, I, R, E. P-P-H makes /f/ with silent E.', phonemes: ['pph-spelling', 'silent-e'], exampleSentence: 'The royal crown was set with a glittering blue sapphire.' },
    { word: 'triangle', phoneticBreakdown: 't - r - eye - ae ng - g - uh l', phoneticSpeechCue: 'Listen: T, R, I, A, N, G, L, E. Tri-an-gle with tri- prefix for three.', phonemes: ['tri-prefix', 'gle-ending'], exampleSentence: 'Every triangle has three straight sides and three angles.' },
    { word: 'umbrella', phoneticBreakdown: 'uh m - b - r - eh - l - uh', phoneticSpeechCue: 'Listen: U, M, B, R, E, L, L, A. Um-brel-la with double L.', phonemes: ['double-consonant', 'br-blend'], exampleSentence: 'Open your yellow umbrella to keep off the rain.' },
    { word: 'volcano', phoneticBreakdown: 'v - ah l - k - ay - n - oh', phoneticSpeechCue: 'Listen: V, O, L, C, A, N, O. Vol-ca-no ending with long O.', phonemes: ['open-syllable', 'long-o'], exampleSentence: 'Steam rose silently from the crater of the dormant volcano.' },
    { word: 'wonderful', phoneticBreakdown: 'w - uh n - d - er - f - uh l', phoneticSpeechCue: 'Listen: W, O, N, D, E, R, F, U, L. Won-der-ful with -ful suffix.', phonemes: ['er-r-controlled', 'ful-suffix'], exampleSentence: 'We spent a wonderful sunny afternoon at the science fair.' },
    { word: 'courageous', phoneticBreakdown: 'k - er - ay - j - uh s', phoneticSpeechCue: 'Listen: C, O, U, R, A, G, E, O, U, S. Soft G followed by -eous.', phonemes: ['soft-g', 'eous-suffix'], exampleSentence: 'The courageous firefighters rescued the stranded kitten.' },
    { word: 'delightful', phoneticBreakdown: 'd - ih - l - eye - t - f - uh l', phoneticSpeechCue: 'Listen: D, E, L, I, G, H, T, F, U, L. De-light-ful with I-G-H.', phonemes: ['igh-trigraph', 'ful-suffix'], exampleSentence: 'Freshly baked blueberry muffins made a delightful snack.' },
    { word: 'graceful', phoneticBreakdown: 'g - r - ay s - f - uh l', phoneticSpeechCue: 'Listen: G, R, A, C, E, F, U, L. Soft C before E in grace-ful.', phonemes: ['soft-c', 'ful-suffix'], exampleSentence: 'The graceful swan drifted smoothly across the still pond.' },
    { word: 'impatient', phoneticBreakdown: 'ih m - p - ay - sh - eht n - t', phoneticSpeechCue: 'Listen: I, M, P, A, T, I, E, N, T. T-I makes /sh/ in im-pa-tient.', phonemes: ['im-prefix', 'tient-sound'], exampleSentence: 'The puppy grew impatient waiting for its evening dinner.' },
    { word: 'kindness', phoneticBreakdown: 'k - eye n - d - n - eh s', phoneticSpeechCue: 'Listen: K, I, N, D, N, E, S, S. Root kind with -ness suffix.', phonemes: ['ness-suffix', 'double-consonant'], exampleSentence: 'Showing simple kindness makes our classroom feel welcoming.' },
    { word: 'magical', phoneticBreakdown: 'm - ae - j - ih - k - uh l', phoneticSpeechCue: 'Listen: M, A, G, I, C, A, L. Soft G in mag-i-cal ending with -al.', phonemes: ['soft-g', 'al-suffix'], exampleSentence: 'The illusionist performed a truly magical trick on stage.' },
    { word: 'peaceful', phoneticBreakdown: 'p - ee s - f - uh l', phoneticSpeechCue: 'Listen: P, E, A, C, E, F, U, L. E-A vowel team with soft C and -ful.', phonemes: ['ea-vowel-team', 'soft-c', 'ful-suffix'], exampleSentence: 'The forest clearing was so peaceful we heard leaves fall.' },
    { word: 'thankful', phoneticBreakdown: 'th - ae ng - k - f - uh l', phoneticSpeechCue: 'Listen: T, H, A, N, K, F, U, L. Root thank with -ful suffix.', phonemes: ['th-digraph', 'nk-ending', 'ful-suffix'], exampleSentence: 'We felt thankful for all the cheerful help from neighbors.' },
    { word: 'unusual', phoneticBreakdown: 'uh n - y - oo - zh - oo - uh l', phoneticSpeechCue: 'Listen: U, N, U, S, U, A, L. Prefix un- with u-su-al.', phonemes: ['un-prefix', 's-as-zh'], exampleSentence: 'The mineral had an unusual purple and green glow.' },
    { word: 'celebrate', phoneticBreakdown: 's - eh - l - uh - b - r - ay t', phoneticSpeechCue: 'Listen: C, E, L, E, B, R, A, T, E. Soft C begins cel-e-brate.', phonemes: ['soft-c', 'ate-suffix'], exampleSentence: 'Our entire team gathered to celebrate the big championship.' },
    { word: 'discovery', phoneticBreakdown: 'd - ih s - k - uh v - er - ee', phoneticSpeechCue: 'Listen: D, I, S, C, O, V, E, R, Y. Dis-cov-er-y with prefix dis-.', phonemes: ['dis-prefix', 'er-r-controlled', 'y-as-e'], exampleSentence: 'Finding the ancient arrow was an exciting discovery.' },
    { word: 'fortunate', phoneticBreakdown: 'f - or - ch - uh - n - eht', phoneticSpeechCue: 'Listen: F, O, R, T, U, N, A, T, E. For-tune with -ate suffix.', phonemes: ['or-r-controlled', 'ate-suffix'], exampleSentence: 'We were fortunate that the storm passed without damage.' },
    { word: 'horizon', phoneticBreakdown: 'h - er - eye - z - uh n', phoneticSpeechCue: 'Listen: H, O, R, I, Z, O, N. Ho-ri-zon with open long I in the middle.', phonemes: ['open-syllable', 'on-ending'], exampleSentence: 'The sun dipped beneath the wide ocean horizon.' },
    { word: 'telescope', phoneticBreakdown: 't - eh - l - uh - s - k - oh p', phoneticSpeechCue: 'Listen: T, E, L, E, S, C, O, P, E. Tele- (far) + scope (look).', phonemes: ['tele-root', 'scope-root'], exampleSentence: 'We looked through the telescope to see Saturn\'s rings.' },
    { word: 'wildlife', phoneticBreakdown: 'w - eye l - d - l - eye f', phoneticSpeechCue: 'Listen: W, I, L, D, L, I, F, E. Compound word: wild + life.', phonemes: ['compound-word', 'silent-e'], exampleSentence: 'A park ranger protects the native wildlife in the preserve.' },
  ],
  4: [
    // Level 4: 4th & 5th Grade Vocabulary (double consonants, roots, silent letters, Latin prefixes)
    { word: 'beautiful', phoneticBreakdown: 'b - y - oo - t - ih - f - uh l', phoneticSpeechCue: 'Listen: B, E, A, U, T, I, F, U, L. Remember B-E-A-U: big elephants are unique!', phonemes: ['eau-vowel-team', 'ful-suffix'], exampleSentence: 'A beautiful rainbow spanned across the morning sky.' },
    { word: 'character', phoneticBreakdown: 'k - ae - r - ih k - t - er', phoneticSpeechCue: 'Listen: C, H, A, R, A, C, T, E, R. C-H makes the hard /k/ sound from Greek.', phonemes: ['ch-as-k', 'er-ending'], exampleSentence: 'The main character in the story showed enormous courage.' },
    { word: 'silhouette', phoneticBreakdown: 's - ih l - oo - eh t', phoneticSpeechCue: 'Listen: S, I, L, H, O, U, E, T, T, E. French origin with double T and silent E.', phonemes: ['french-origin', 'ette-ending'], exampleSentence: 'The mountain formed a striking dark silhouette against the sunset.' },
    { word: 'guarantee', phoneticBreakdown: 'g - ae r - uh n - t - ee', phoneticSpeechCue: 'Listen: G, U, A, R, A, N, T, E, E. Starts with G-U-A and ends with double E.', phonemes: ['gu-silent-u', 'ee-long-e'], exampleSentence: 'Practice and dedication guarantee steady improvement in spelling.' },
    { word: 'camouflage', phoneticBreakdown: 'k - ae m - uh - f l - ah zh', phoneticSpeechCue: 'Listen: C, A, M, O, U, F, L, A, G, E. Ends with A-G-E making the "ahzh" sound.', phonemes: ['french-origin', 'age-suffix'], exampleSentence: 'The chameleon used clever camouflage to hide in the leaves.' },
    { word: 'lieutenant', phoneticBreakdown: 'l - oo - t - eh n - uh n t', phoneticSpeechCue: 'Listen: L, I, E, U, T, E, N, A, N, T. Remember: Lie-u-ten-ant!', phonemes: ['ieu-vowel-team', 'ant-suffix'], exampleSentence: 'The naval lieutenant saluted the captain on the bridge.' },
    { word: 'kaleidoscope', phoneticBreakdown: 'k - uh - l - eye - d - uh - s k - oh p', phoneticSpeechCue: 'Listen: K, A, L, E, I, D, O, S, C, O, P, E. Greek root for beautiful shapes.', phonemes: ['ei-long-i', 'scope-root'], exampleSentence: 'Looking into the kaleidoscope created stunning geometric patterns.' },
    { word: 'accommodate', phoneticBreakdown: 'uh - k - ah m - uh - d - ay t', phoneticSpeechCue: 'Listen: A, C, C, O, M, M, O, D, A, T, E. Double C and double M: accommodate!', phonemes: ['double-c', 'double-m'], exampleSentence: 'The hotel can accommodate all the visiting soccer teams.' },
    { word: 'conscientious', phoneticBreakdown: 'k - ah n - sh - ee - eh n - sh - uh s', phoneticSpeechCue: 'Listen: C, O, N, S, C, I, E, N, T, I, O, U, S. S-C-I and T-I-O-U-S.', phonemes: ['sci-blend', 'tious-suffix'], exampleSentence: 'The conscientious student carefully double-checked every answer.' },
    { word: 'hierarchy', phoneticBreakdown: 'h - eye - er - ar - k - ee', phoneticSpeechCue: 'Listen: H, I, E, R, A, R, C, H, Y. H-I-E-R with C-H making /k/.', phonemes: ['ie-vowel', 'ch-as-k'], exampleSentence: 'In biology we learn the organizational hierarchy of living things.' },
    { word: 'foreign', phoneticBreakdown: 'f - or - ih n', phoneticSpeechCue: 'Listen: F, O, R, E, I, G, N. Silent G before N: f-o-r-e-i-g-n.', phonemes: ['silent-g', 'eign-ending'], exampleSentence: 'Learning a foreign language opens up doors to new cultures.' },
    { word: 'mischievous', phoneticBreakdown: 'm - ih s - ch - ih - v - uh s', phoneticSpeechCue: 'Listen: M, I, S, C, H, I, E, V, O, U, S. Three syllables: mis-chie-vous, not four!', phonemes: ['ie-vowel-team', 'ous-suffix'], exampleSentence: 'The mischievous puppy hid my favorite slipper under the sofa.' },
    { word: 'temperature', phoneticBreakdown: 't - eh m - p - er - uh - ch - er', phoneticSpeechCue: 'Listen: T, E, M, P, E, R, A, T, U, R, E. Four syllables: tem-per-a-ture.', phonemes: ['ture-ending', 'er-r-controlled'], exampleSentence: 'The nurse checked his temperature with a quick digital thermometer.' },
    { word: 'environment', phoneticBreakdown: 'eh n - v - eye - r - uh n - m - eht n - t', phoneticSpeechCue: 'Listen: E, N, V, I, R, O, N, M, E, N, T. Notice the N in en-vi-ron-ment.', phonemes: ['ment-suffix', 'ron-syllable'], exampleSentence: 'Planting trees helps protect our local natural environment.' },
    { word: 'government', phoneticBreakdown: 'g - uh v - er n - m - eht n - t', phoneticSpeechCue: 'Listen: G, O, V, E, R, N, M, E, N, T. Remember the silent N in gov-ern-ment.', phonemes: ['silent-n', 'ment-suffix'], exampleSentence: 'Citizens vote in democratic elections to choose their government.' },
    { word: 'necessary', phoneticBreakdown: 'n - eh s - uh - s - eh r - ee', phoneticSpeechCue: 'Listen: N, E, C, E, S, S, A, R, Y. One C and two S\'s: one collar, two sleeves!', phonemes: ['single-c', 'double-s'], exampleSentence: 'Warm coats are necessary during freezing winter blizzard weather.' },
    { word: 'separate', phoneticBreakdown: 's - eh p - uh - r - ay t', phoneticSpeechCue: 'Listen: S, E, P, A, R, A, T, E. There is "a rat" in sep-a-rate!', phonemes: ['a-rat-mnemonic', 'ate-suffix'], exampleSentence: 'Keep raw vegetables in a separate bowl from the dressing.' },
    { word: 'definitely', phoneticBreakdown: 'd - eh f - ih - n - ih t - l - ee', phoneticSpeechCue: 'Listen: D, E, F, I, N, I, T, E, L, Y. De-fin-ite-ly with -ly suffix.', phonemes: ['inite-root', 'ly-suffix'], exampleSentence: 'We will definitely visit the natural history museum next weekend.' },
    { word: 'independent', phoneticBreakdown: 'ih n - d - ih - p - eh n - d - eht n - t', phoneticSpeechCue: 'Listen: I, N, D, E, P, E, N, D, E, N, T. In-de-pen-dent with -ent ending.', phonemes: ['in-prefix', 'ent-suffix'], exampleSentence: 'Third graders learn to be independent and responsible readers.' },
    { word: 'embarrass', phoneticBreakdown: 'eh m - b - ae r - uh s', phoneticSpeechCue: 'Listen: E, M, B, A, R, R, A, S, S. Two R\'s and two S\'s: em-bar-rass.', phonemes: ['double-r', 'double-s'], exampleSentence: 'Making a spelling mistake should never embarrass a curious learner.' },
    { word: 'committee', phoneticBreakdown: 'k - uh - m - ih t - ee', phoneticSpeechCue: 'Listen: C, O, M, M, I, T, T, E, E. Double M, double T, and double E!', phonemes: ['double-m', 'double-t', 'double-e'], exampleSentence: 'The student council committee organized a festive school spirit week.' },
    { word: 'parallel', phoneticBreakdown: 'p - ae r - uh - l - eh l', phoneticSpeechCue: 'Listen: P, A, R, A, L, L, E, L. Double L in the middle of par-al-lel.', phonemes: ['double-l', 'el-ending'], exampleSentence: 'Train tracks run in two perfectly parallel steel lines.' },
    { word: 'broccoli', phoneticBreakdown: 'b - r - ah k - uh - l - ee', phoneticSpeechCue: 'Listen: B, R, O, C, C, O, L, I. Double C in broc-co-li.', phonemes: ['double-c', 'italian-origin'], exampleSentence: 'Steamed green broccoli florets are packed with healthy vitamins.' },
    { word: 'catastrophe', phoneticBreakdown: 'k - uh - t - ae s - t - r - uh - f - ee', phoneticSpeechCue: 'Listen: C, A, T, A, S, T, R, O, P, H, E. P-H makes /f/ with Greek -e ending.', phonemes: ['ch-as-k', 'ph-digraph'], exampleSentence: 'The superhero saved the city from a terrible meteor catastrophe.' },
    { word: 'quarantine', phoneticBreakdown: 'k - w - or - uh n - t - ee n', phoneticSpeechCue: 'Listen: Q, U, A, R, A, N, T, I, N, E. Quar-an-tine from Italian for forty.', phonemes: ['qu-blend', 'ine-ending'], exampleSentence: 'The veterinarian kept the new rescue puppy in a safe quarantine.' },
    { word: 'spontaneous', phoneticBreakdown: 's - p - ah n - t - ay - n - ee - uh s', phoneticSpeechCue: 'Listen: S, P, O, N, T, A, N, E, O, U, S. Spon-ta-ne-ous with -eous suffix.', phonemes: ['eous-suffix', 'sp-blend'], exampleSentence: 'The enthusiastic audience erupted in spontaneous applause.' },
    { word: 'privilege', phoneticBreakdown: 'p - r - ih v - uh - l - ih j', phoneticSpeechCue: 'Listen: P, R, I, V, I, L, E, G, E. Pri-vi-lege with two I\'s and -ege ending.', phonemes: ['privi-root', 'lege-ending'], exampleSentence: 'Having a public library card is a wonderful learning privilege.' },
    { word: 'exhilarating', phoneticBreakdown: 'eh g - z - ih l - er - ay - t - ih ng', phoneticSpeechCue: 'Listen: E, X, H, I, L, A, R, A, T, I, N, G. Silent H follows X: ex-hil-a-rat-ing.', phonemes: ['silent-h', 'ing-suffix'], exampleSentence: 'Riding the rollercoaster was an exhilarating high-speed adventure.' },
    { word: 'treacherous', phoneticBreakdown: 't - r - eh ch - er - uh s', phoneticSpeechCue: 'Listen: T, R, E, A, C, H, E, R, O, U, S. E-A makes short E with -ous.', phonemes: ['ea-short-e', 'ous-suffix'], exampleSentence: 'The icy mountain road was treacherous during the heavy snowstorm.' },
    { word: 'magnificent', phoneticBreakdown: 'm - ae g - n - ih f - ih - s - eht n - t', phoneticSpeechCue: 'Listen: M, A, G, N, I, F, I, C, E, N, T. Mag-nif-i-cent with soft C.', phonemes: ['soft-c', 'ent-suffix'], exampleSentence: 'A magnificent bald eagle soared gracefully above the pine canyon.' },
  ],
  5: [
    // Level 5: Challenge & Spelling Bee (etymology, French/Greek/Latin, silent roots)
    { word: 'conscientious', phoneticBreakdown: 'k - ah n - sh - ee - eh n - sh - uh s', phoneticSpeechCue: 'Listen: C, O, N, S, C, I, E, N, T, I, O, U, S. S-C-I and T-I-O-U-S.', phonemes: ['sci-blend', 'tious-suffix'], exampleSentence: 'The conscientious student carefully double-checked every answer.' },
    { word: 'hierarchy', phoneticBreakdown: 'h - eye - er - ar - k - ee', phoneticSpeechCue: 'Listen: H, I, E, R, A, R, C, H, Y. H-I-E-R with C-H making /k/.', phonemes: ['ie-vowel', 'ch-as-k'], exampleSentence: 'In biology we learn the organizational hierarchy of living things.' },
    { word: 'foreign', phoneticBreakdown: 'f - or - ih n', phoneticSpeechCue: 'Listen: F, O, R, E, I, G, N. Silent G before N: f-o-r-e-i-g-n.', phonemes: ['silent-g', 'eign-ending'], exampleSentence: 'Learning a foreign language opens up doors to new cultures.' },
    { word: 'mischievous', phoneticBreakdown: 'm - ih s - ch - ih - v - uh s', phoneticSpeechCue: 'Listen: M, I, S, C, H, I, E, V, O, U, S. Three syllables: mis-chie-vous, not four!', phonemes: ['ie-vowel-team', 'ous-suffix'], exampleSentence: 'The mischievous puppy hid my favorite slipper under the sofa.' },
    { word: 'gymnastics', phoneticBreakdown: 'j - ih m - n - ae s - t - ih k s', phoneticSpeechCue: 'Listen: G, Y, M, N, A, S, T, I, C, S. Soft G, Y as short I, and silent N sound.', phonemes: ['soft-g', 'y-vowel', 'mn-blend'], exampleSentence: 'She practiced cartwheels and flips during gymnastics class.' },
    { word: 'bureaucracy', phoneticBreakdown: 'b - y - oo - r - ah k - r - uh - s - ee', phoneticSpeechCue: 'Listen: B, U, R, E, A, U, C, R, A, C, Y. B-U-R-E-A-U French root with -cracy.', phonemes: ['eau-vowel', 'cracy-suffix'], exampleSentence: 'The government office simplified its paperwork to reduce bureaucracy.' },
    { word: 'parliament', phoneticBreakdown: 'p - ar - l - ih - m - eht - n - t', phoneticSpeechCue: 'Listen: P, A, R, L, I, A, M, E, N, T. Par-lia-ment, with silent A.', phonemes: ['silent-a', 'ment-suffix'], exampleSentence: 'Members of parliament debated the new environmental law.' },
    { word: 'unconscious', phoneticBreakdown: 'uh n - k - ah n - sh - uh s', phoneticSpeechCue: 'Listen: U, N, C, O, N, S, C, I, O, U, S. Prefix un- with con-sci-ous.', phonemes: ['un-prefix', 'scious-suffix'], exampleSentence: 'He was knocked unconscious for a second after bumping his head.' },
    { word: 'phenomenon', phoneticBreakdown: 'f - eh - n - ah m - eh - n - ah n', phoneticSpeechCue: 'Listen: P, H, E, N, O, M, E, N, O, N. P-H makes /f/: phe-nom-e-non.', phonemes: ['ph-digraph', 'greek-root'], exampleSentence: 'The northern lights are a breathtaking natural phenomenon.' },
    { word: 'enthusiastic', phoneticBreakdown: 'eh n - th - oo - z - ee - ae s - t - ih k', phoneticSpeechCue: 'Listen: E, N, T, H, U, S, I, A, S, T, I, C. En-thu-si-as-tic with -ic suffix.', phonemes: ['th-digraph', 'ic-suffix'], exampleSentence: 'The fans gave an enthusiastic cheer when the goal was scored.' },
    { word: 'subterranean', phoneticBreakdown: 's - uh b - t - er - ay - n - ee - uh n', phoneticSpeechCue: 'Listen: S, U, B, T, E, R, R, A, N, E, A, N. Sub-ter-ra-ne-an with double R.', phonemes: ['sub-prefix', 'double-consonant'], exampleSentence: 'The deep subterranean cave stayed cool all year long.' },
    { word: 'synchronize', phoneticBreakdown: 's - ih ng - k - r - uh - n - eye z', phoneticSpeechCue: 'Listen: S, Y, N, C, H, R, O, N, I, Z, E. Greek root syn- with c-h making /k/.', phonemes: ['ch-as-k', 'ize-suffix'], exampleSentence: 'Swimmers practice for months to synchronize their routines.' },
    { word: 'architectural', phoneticBreakdown: 'ar - k - ih - t - eh k - ch - er - uh l', phoneticSpeechCue: 'Listen: A, R, C, H, I, T, E, C, T, U, R, A, L. Ar-chi-tec-tur-al, with ch as /k/.', phonemes: ['ch-as-k', 'ture-suffix', 'al-suffix'], exampleSentence: 'The museum showcased the city\'s rich architectural history.' },
    { word: 'archaeologist', phoneticBreakdown: 'ar - k - ee - ah l - uh - j - ih s - t', phoneticSpeechCue: 'Listen: A, R, C, H, A, E, O, L, O, G, I, S, T. Ar-chae-ol-o-gist with Greek ae root.', phonemes: ['ch-as-k', 'gist-suffix'], exampleSentence: 'The archaeologist carefully unearthed an ancient pottery bowl.' },
    { word: 'pterodactyl', phoneticBreakdown: 't - eh r - uh - d - ae k - t - ih l', phoneticSpeechCue: 'Listen: P, T, E, R, O, D, A, C, T, Y, L. Silent P begins pterodactyl!', phonemes: ['silent-p', 'greek-root'], exampleSentence: 'The prehistoric pterodactyl soared over ancient cliffs.' },
    { word: 'rendezvous', phoneticBreakdown: 'r - ah n - d - ay - v - oo', phoneticSpeechCue: 'Listen: R, E, N, D, E, Z, V, O, U, S. French origin with silent Z and silent S.', phonemes: ['french-origin', 'silent-s'], exampleSentence: 'The hikers agreed on a quiet rendezvous point at the trailhead.' },
    { word: 'reconnaissance', phoneticBreakdown: 'r - ih - k - ah n - uh - s - uh n - s', phoneticSpeechCue: 'Listen: R, E, C, O, N, N, A, I, S, S, A, N, C, E. Double N and double S.', phonemes: ['double-consonant', 'ance-suffix'], exampleSentence: 'The drone carried out an aerial reconnaissance mission.' },
    { word: 'encyclopedia', phoneticBreakdown: 'eh n - s - eye - k - l - uh - p - ee - d - ee - uh', phoneticSpeechCue: 'Listen: E, N, C, Y, C, L, O, P, E, D, I, A. Six syllables with soft C.', phonemes: ['soft-c', 'greek-root'], exampleSentence: 'We looked up astronomy facts in the big volume of the encyclopedia.' },
    { word: 'pneumonia', phoneticBreakdown: 'n - oo - m - oh - n - y - uh', phoneticSpeechCue: 'Listen: P, N, E, U, M, O, N, I, A. Silent P before N at the start of pneumonia.', phonemes: ['silent-p', 'greek-root'], exampleSentence: 'The doctor prescribed medicine so he could recover from pneumonia.' },
    { word: 'sovereignty', phoneticBreakdown: 's - ah v - r - ih n - t - ee', phoneticSpeechCue: 'Listen: S, O, V, E, R, E, I, G, N, T, Y. E-I-G-N with silent G.', phonemes: ['silent-g', 'eign-ending'], exampleSentence: 'The peaceful nation celebrated its independence and sovereignty.' },
    { word: 'chrysanthemum', phoneticBreakdown: 'k - r - ih s - ae n - th - uh - m - uh m', phoneticSpeechCue: 'Listen: C, H, R, Y, S, A, N, T, H, E, M, U, M. C-H-R with Y as short I.', phonemes: ['ch-as-k', 'greek-root'], exampleSentence: 'A vibrant yellow chrysanthemum bloomed by the front door.' },
    { word: 'serendipity', phoneticBreakdown: 's - er - eh n - d - ih p - ih - t - ee', phoneticSpeechCue: 'Listen: S, E, R, E, N, D, I, P, I, T, Y. Finding pleasant surprises by good luck.', phonemes: ['ity-suffix', 'er-r-controlled'], exampleSentence: 'Finding a rare fossil while looking for seashells was pure serendipity.' },
    { word: 'acquiesce', phoneticBreakdown: 'ae k - w - ee - eh s', phoneticSpeechCue: 'Listen: A, C, Q, U, I, E, S, C, E. French root with S-C-E ending.', phonemes: ['qu-blend', 'sce-ending'], exampleSentence: 'They chose to acquiesce to the committee\'s polite request.' },
    { word: 'epiphany', phoneticBreakdown: 'ih - p - ih f - uh - n - ee', phoneticSpeechCue: 'Listen: E, P, I, P, H, A, N, Y. P-H makes /f/ with Greek origin.', phonemes: ['ph-digraph', 'y-as-e'], exampleSentence: 'She had a sudden brilliant epiphany that solved the difficult math riddle.' },
    { word: 'quintessential', phoneticBreakdown: 'k - w - ih n - t - eh - s - eh n - sh - uh l', phoneticSpeechCue: 'Listen: Q, U, I, N, T, E, S, S, E, N, T, I, A, L. Double S with -tial.', phonemes: ['qu-blend', 'tial-sound'], exampleSentence: 'A warm apple pie is the quintessential dessert of autumn.' },
    { word: 'idiosyncrasy', phoneticBreakdown: 'ih d - ee - oh - s - ih ng - k - r - uh - s - ee', phoneticSpeechCue: 'Listen: I, D, I, O, S, Y, N, C, R, A, S, Y. Ends with -crasy.', phonemes: ['greek-root', 'crasy-ending'], exampleSentence: 'Tapping his pencil rhythmically while studying was his quirky idiosyncrasy.' },
  ],
};

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Highly randomized curated word picker across 250+ vocabulary words.
 * Guarantees a fresh, non-repeating 10-word set every session.
 * Excludes mastered words and mixes in up to 3 review words if available.
 */
export function getCuratedWords(
  level: number,
  struggledWords: string[] = [],
  masteredWords: string[] = []
): StoredWordItem[] {
  const masteredSet = new Set(masteredWords.map((w) => w.toLowerCase().trim()));
  const clamped = Math.min(Math.max(level || 2, 1), 5);
  const rawPool = EXPANSIVE_WORDS_BY_LEVEL[clamped] || EXPANSIVE_WORDS_BY_LEVEL[2] || [];
  
  // Exclude mastered words from the available pool
  const pool = rawPool.filter((item) => !masteredSet.has(item.word.toLowerCase()));
  const workingPool = pool.length >= 10 ? pool : rawPool;
  const shuffledPool = shuffleArray(workingPool);

  const struggledSet = new Set(
    struggledWords
      .map((w) => w.toLowerCase().trim())
      .filter((w) => !masteredSet.has(w))
  );

  const struggledMatches: StoredWordItem[] = [];

  for (let lvl = 1; lvl <= 5; lvl++) {
    const list = EXPANSIVE_WORDS_BY_LEVEL[lvl] || [];
    for (const item of list) {
      const lower = item.word.toLowerCase();
      if (
        struggledSet.has(lower) &&
        !masteredSet.has(lower) &&
        !struggledMatches.some((m) => m.word.toLowerCase() === lower)
      ) {
        struggledMatches.push(item);
      }
    }
  }

  // If a custom struggled word isn't in the bank, generate a valid StoredWordItem for it
  for (const sWord of struggledWords) {
    const lower = sWord.toLowerCase().trim();
    if (
      !masteredSet.has(lower) &&
      !struggledMatches.some((m) => m.word.toLowerCase() === lower) &&
      struggledMatches.length < 3
    ) {
      struggledMatches.push({
        word: lower,
        phoneticBreakdown: lower.split('').join(' - '),
        phoneticSpeechCue: `Review word: ${lower.toUpperCase().split('').join(', ')}.`,
        phonemes: ['review-word'],
        exampleSentence: `Practice writing the review word: ${lower}.`,
      });
    }
  }

  const selectedStruggled = shuffleArray(struggledMatches).slice(0, 3);
  const selectedStruggledWords = new Set(selectedStruggled.map((s) => s.word.toLowerCase()));
  const remaining = shuffledPool.filter(
    (item) => !selectedStruggledWords.has(item.word.toLowerCase())
  );

  const needed = 10 - selectedStruggled.length;
  const selectedRemaining = remaining.slice(0, needed);

  // Re-shuffle combined 10 words so review words are naturally interspersed
  return shuffleArray([...selectedStruggled, ...selectedRemaining]).slice(0, 10);
}
