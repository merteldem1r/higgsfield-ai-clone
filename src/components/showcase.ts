import type { AspectId } from "@/lib/credits";

// Our own Flux Dev generations (public/showcase/), with the exact prompt that produced each one,
// so "Recreate" hands the visitor something that really makes this picture.
export type ShowcaseItem = { src: string; prompt: string; aspect: AspectId; width: number; height: number };

const SIZE: Record<AspectId, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "3:4": { width: 768, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "9:16": { width: 576, height: 1024 },
  "16:9": { width: 1024, height: 576 },
};

function item(src: string, aspect: AspectId, prompt: string): ShowcaseItem {
  return { src, prompt, aspect, ...SIZE[aspect] };
}

export const SHOWCASE: ShowcaseItem[] = [
  item("/showcase/g01.jpg", "16:9", "aerial view of a winding river through an autumn forest at dawn, low mist, cinematic, ultra detailed"),
  item("/showcase/g02.jpg", "9:16", "brutalist concrete stairwell spiraling upward, a single shaft of sunlight, dust in the air, architectural photography"),
  item("/showcase/g03.jpg", "3:4", "a glass sphere resting on black sand reflecting a stormy sky, macro, dramatic rim light"),
  item("/showcase/05.jpg", "3:4", "cinematic wide shot, a lone astronaut standing in a desert at dusk, long shadows, orange and violet sky, epic scale"),
  item("/showcase/g04.jpg", "16:9", "a neon-lit rainy alley in Tokyo at night, empty, reflections on wet pavement, cinematic wide shot"),
  item("/showcase/g05.jpg", "4:3", "a vintage film camera on a wooden desk, warm window light, shallow depth of field, still life"),
  item("/showcase/g06.jpg", "9:16", "long-exposure light trails, ribbons of violet and peach light in a dark studio, abstract"),
  item("/showcase/07.jpg", "3:4", "a vintage red sports car on a coastal highway at blue hour, headlights on, cinematic, anamorphic lens flare"),
  item("/showcase/g07.jpg", "3:4", "a lone lighthouse on a sea cliff under a starry sky, milky way, long exposure"),
  item("/showcase/g08.jpg", "16:9", "a desert canyon at golden hour with a winding road, drone shot, warm tones, epic scale"),
  item("/showcase/g09.jpg", "3:4", "iridescent soap bubble surface, extreme macro, swirling color, black background"),
  item("/showcase/g10.jpg", "4:3", "a modern glass house in a snowy pine forest at blue hour, warm interior lights glowing"),
  item("/showcase/01.jpg", "3:4", "cinematic film still, a jazz trumpeter playing in a dim smoky bar, warm tungsten light, 35mm lens, shallow depth of field, film grain"),
  item("/showcase/g11.jpg", "9:16", "a towering red rock arch under a deep blue night sky full of stars, cinematic"),
  item("/showcase/g12.jpg", "16:9", "a futuristic empty train station with curved white architecture, soft morning light, symmetrical"),
];
