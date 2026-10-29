import JSZip from 'jszip';
import { Book, Chapter } from '../types';
import { createChapterFileName, estimateDuration, estimateFileSize } from './textCleaner';

/**
 * Strips HTML tags, styles, scripts, and extracts clean readable prose.
 */
function cleanHtmlContent(html: string): { title: string; text: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove scripts, styles, navs
  doc.querySelectorAll('script, style, nav, noscript').forEach((el) => el.remove());

  // Try to find chapter heading
  const headingEl = doc.querySelector('h1, h2, h3, .chapter-title, .title');
  const title = headingEl?.textContent?.trim() || '';

  // Extract paragraphs or body text
  const paragraphs = Array.from(doc.querySelectorAll('p, div, blockquote'))
    .map((p) => p.textContent?.trim() || '')
    .filter((p) => p.length > 0);

  let fullText = paragraphs.join('\n\n');
  if (!fullText) {
    fullText = doc.body?.textContent?.trim() || '';
  }

  // Clean whitespace
  fullText = fullText.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  return { title, text: fullText };
}

/**
 * Parses an EPUB ArrayBuffer or File completely in-browser.
 */
export async function parseEpubFile(fileData: ArrayBuffer | Blob): Promise<Book> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileData);

  // 1. Find rootfile from META-INF/container.xml
  const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
  let opfPath = 'OEBPS/content.opf';

  if (containerXml) {
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'text/xml');
    const rootfileEl = containerDoc.querySelector('rootfile');
    if (rootfileEl?.getAttribute('full-path')) {
      opfPath = rootfileEl.getAttribute('full-path')!;
    }
  }

  // 2. Read OPF file
  const opfContent = await loadedZip.file(opfPath)?.async('text');
  if (!opfContent) {
    throw new Error('Invalid EPUB: package OPF document not found in archive');
  }

  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'text/xml');

  // Base path of OPF
  const opfBasePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // Extract metadata
  const titleEl = opfDoc.querySelector('metadata > title, metadata > dc\\:title');
  const creatorEl = opfDoc.querySelector('metadata > creator, metadata > dc\\:creator');
  const bookTitle = titleEl?.textContent?.trim() || 'Untitled Audiobook';
  const bookAuthor = creatorEl?.textContent?.trim() || 'Unknown Author';

  // Extract manifest items (id -> href)
  const manifestItems: Record<string, string> = {};
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      manifestItems[id] = href;
    }
  });

  // Extract spine items in sequential reading order
  const spineItemRefs: string[] = [];
  opfDoc.querySelectorAll('spine > itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref');
    if (idref && manifestItems[idref]) {
      spineItemRefs.push(manifestItems[idref]);
    }
  });

  const chapters: Chapter[] = [];
  let chapterIndex = 1;

  for (const relativeHref of spineItemRefs) {
    // Resolve relative path
    const resolvedPath = (opfBasePath + relativeHref).replace(/^\//, '');
    const chapterFile = loadedZip.file(resolvedPath);
    if (!chapterFile) continue;

    const htmlContent = await chapterFile.async('text');
    const { title: extractedTitle, text: cleanText } = cleanHtmlContent(htmlContent);

    // Skip empty filler files or small copyright stubs with < 40 words unless it has content
    const words = cleanText.split(/\s+/).filter(Boolean).length;
    if (words < 25) continue;

    const chapterTitle =
      extractedTitle ||
      `Chapter ${chapterIndex}: ${cleanText.slice(0, 35).replace(/\n/g, ' ').trim()}...`;

    const estimatedDurationSec = estimateDuration(words, 1.0);
    const estimatedFileSizeBytes = estimateFileSize(estimatedDurationSec, 128);

    chapters.push({
      id: `chap-${chapterIndex}-${Math.random().toString(36).slice(2, 7)}`,
      index: chapterIndex,
      title: chapterTitle,
      cleanText,
      wordCount: words,
      estimatedDurationSec,
      estimatedFileSizeBytes,
      status: 'idle',
      progress: 0,
      fileName: createChapterFileName(chapterIndex, chapterTitle),
    });

    chapterIndex++;
  }

  if (chapters.length === 0) {
    throw new Error('No readable text chapters found in the provided EPUB archive');
  }

  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  const calculatedDurationSec = chapters.reduce((sum, c) => sum + c.estimatedDurationSec, 0);
  const calculatedFileSizeBytes = chapters.reduce((sum, c) => sum + c.estimatedFileSizeBytes, 0);

  return {
    id: `book-${Date.now()}`,
    title: bookTitle,
    author: bookAuthor,
    chapters,
    totalWords,
    calculatedDurationSec,
    calculatedFileSizeBytes,
  };
}

/**
 * Returns a complete, high-quality bundled demo book:
 * "The Time Machine" by H.G. Wells
 */
export function getSampleBook(): Book {
  const chaptersData = [
    {
      title: 'Chapter 1: The Fourth Dimension',
      text: `The Time Traveller was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses. Our chairs, being his patents, embraced and caressed us rather than submitted to be sat upon, and there was that luxurious after-dinner atmosphere when thought roams gracefully free of the trammels of precision. And he put it to us in this simple way—marking the points with a lean forefinger—as we sat and lazily admired his earnestness over this new paradox.\n\n"You must follow me carefully. I shall have to controvert one or two ideas that are almost universally accepted. The geometry, for instance, they taught you at school is founded on a misconception."\n\n"Is not that rather a large thing to expect us to begin upon?" said Filby, an argumentative person with red hair.\n\n"I do not mean to ask you to accept anything without reasonable ground for it. You will soon admit as much as I need from you. You know of course that a mathematical line, a line of thickness nil, has no real existence. They taught you that? Nor has a mathematical plane. These things are mere abstractions."\n\n"That is all right," said the Psychologist.\n\n"Nor, having only length, breadth, and thickness, can a cube have a real existence."\n\n"There I object," said Filby. "Of course a solid body may exist. All real things are three-dimensional."\n\n"So most people think. But wait a moment. Can an instantaneous cube exist?"\n\n"Don't follow you," said Filby.\n\n"Can a cube that does not last for any time at all, have a real existence?" Filby had to pause and think. "Clearly," the Time Traveller proceeded, "any real body must have extension in four directions: it must have Length, Breadth, Thickness, and—Duration. There are really four dimensions, three which we call the three planes of Space, and a fourth, Time."`,
    },
    {
      title: 'Chapter 2: The Machine in the Laboratory',
      text: `The thing the Time Traveller held in his hand was a glittering metallic framework, scarcely larger than a small clock, and very delicately made. There was ivory in it, and some transparent crystalline substance. And now I must be plain, for what followed, unless his explanation is to be accepted, is an absolutely unaccountable thing. He took one of the little octagonal tables that were scattered about the room, and set it in front of the fire, with two legs on the hearthrug. On this table he placed the mechanism. Then he drew up a chair, and sat down. The only other object on the table was a small shaded lamp, the bright light of which fell upon the model.\n\n"This little affair," said the Time Traveller, resting his elbows upon the table and pressing his hands together above the apparatus, "is only a model. It is my plan for a machine to travel through time. You will notice that it looks singularly askew, and that there is an odd twinkling appearance about this bar, as though it were in some way unreal." He pointed to the part with his finger. "Also, here is one little white lever, and here is another."\n\n"It sounds plausible enough tonight," said the Medical Man; "but wait until tomorrow. Wait for the common sense of the morning."\n\nThe Time Traveller looked at us, and then slowly extended his hand towards the lever. "No," he said suddenly. "Lend me your finger." He turned to the Psychologist, and took that individual's hand in his own and told him to put out his forefinger. So that it was the Psychologist himself who sent that miniature time machine on its journey. We saw the lever push forward, a sudden breath of wind blew out the candle, and the machine grew faint and vanished like a ghost in the air.`,
    },
    {
      title: 'Chapter 3: The Golden Age of 802,701',
      text: `In another moment I was in a vast green hall. I had a grotesque sense of falling, and the feeling of endless velocity. Then came a shock, and I found myself sitting on soft turf in a shower of hail. A colossal figure, carved in what appeared to be white marble, shaped something like a winged sphinx, loomed through the misty grey haze before me. Its pedestals were bronze, green with verdigris, and weather-worn. The hail was turning into a gentle summer rain.\n\nVery soon I noticed a group of figures in rich soft tunics approaching from a nearby palace. They were slight, fragile creatures, scarcely four feet high, clad in purple and white robes. Their skin was of a delicate peach hue, their eyes large and gentle, and their hair curled in soft ringlets about their foreheads. They gathered around me, touching my clothes with soft laughter, singing in a sweet, liquid tongue that sounded like the bubbling of a brook.\n\nThey led me into an enormous hall of carved stone, whose floor was littered with petals and fruit. There were no chairs, but deep cushions of woven silk. Great tables groaned under dishes of exotic fruits, unlike any I had ever tasted in our century. They ate with dainty fingers, offering me strange melons and sweet pulpy berries. There was no meat, no cooking, no fire. The air was warm and balmy, filled with the scent of everlasting blossoms.`,
    },
    {
      title: 'Chapter 4: The Mystery of the Wells',
      text: `As I explored the lush valley during the long, tranquil afternoon, I came upon a series of deep circular wells, each rimmed with heavy bronze masonry. Leaning over the edge into the cool gloom, I could hear a distant, rhythmic thudding sound—thud, thud, thud—like the beating of some subterranean piston or pump. A faint puff of cool, damp air rose rhythmically into my face.\n\n"What are these wells?" I asked myself. There were no buckets, no chains, no water visible in their abysses. And why did the gentle surface people show such terror whenever the shadows lengthened toward dusk?\n\nIt was not long before I discovered that the world of the future was not undivided. Man had not remained one species. In the dark below the earth, another race of beings lived, worked, and kept the great machines in motion. While the graceful Eloi played in the sunshine of their ruined paradise, the Morlocks crept in the cold mechanical tunnels beneath their feet. And as night fell over the silent forest, I realized with a sudden chill of horror that the garden above was not a sanctuary, but a pasture.`,
    },
    {
      title: 'Chapter 5: The Dark Encounter',
      text: `I struck a wax match. The sudden flame flared brilliantly in the blackness of the well chamber, casting long leaping shadows across the damp stone walls. In that instant, I saw them. Several small, white, ape-like figures, with large greyish-red eyes that reflected the light like the eyes of nocturnal animals, scuttled backward into the deeper corridors with soft cries of alarm.\n\nThey had pale, bleached skin, like plants grown in a cellar, and their fingers were long and claw-like. The Morlocks! One of them paused at the corner of a machine, squinting at me through the glare, shielding its photophobic eyes with a sickly white hand. The match flickered and died in the damp draft. Darkness fell upon me like an iron shutter.\n\nI could hear the patter of soft naked feet drawing near in the pitch-black silence, and the faint rustle of their breathing. I felt cold, clammy fingers touch the sleeve of my coat. Grasping my iron lever, I swung blindly into the dark, struck a second match, and sprinted with every ounce of strength toward the faint square of daylight above the shaft, desperate to reach the open sky before the light failed again.`,
    },
  ];

  const chapters: Chapter[] = chaptersData.map((c, i) => {
    const words = c.text.split(/\s+/).filter(Boolean).length;
    const estimatedDurationSec = estimateDuration(words, 1.0);
    const estimatedFileSizeBytes = estimateFileSize(estimatedDurationSec, 128);
    const index = i + 1;

    return {
      id: `sample-chap-${index}`,
      index,
      title: c.title,
      cleanText: c.text,
      wordCount: words,
      estimatedDurationSec,
      estimatedFileSizeBytes,
      status: 'idle',
      progress: 0,
      fileName: createChapterFileName(index, c.title),
    };
  });

  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  const calculatedDurationSec = chapters.reduce((sum, c) => sum + c.estimatedDurationSec, 0);
  const calculatedFileSizeBytes = chapters.reduce((sum, c) => sum + c.estimatedFileSizeBytes, 0);

  return {
    id: 'sample-the-time-machine',
    title: 'The Time Machine',
    author: 'H. G. Wells',
    chapters,
    totalWords,
    calculatedDurationSec,
    calculatedFileSizeBytes,
  };
}
