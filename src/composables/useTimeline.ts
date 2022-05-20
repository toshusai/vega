import { Ref } from "nuxt/dist/app/compat/capi";
import { Timeline } from "../core/Timeline";
import { EffectObject } from "../core/EffectObject";
import { TextStripEffect } from "../core/TextStripEffect";
import { StripEffect } from "../core/StripEffect";
import { TextStripEffectObject } from "../core/TextStripEffectObject";

const initialTimelineState: Timeline = {
  selectedStrips: [],
  isPlay: false,
  width: 1920,
  height: 1080,
  length: 20,
  curent: 3,
  end: 15,
  scale: 20,
  start: 0,
  strips: [
    {
      id: "strip1",
      start: 2.5,
      length: 4,
      layer: 1,
      effects: [
        {
          id: "effect1",
          type: "Text",
          text: "Hello",
          position: {
            x: 10,
            y: -10,
            z: 0,
          },
          color: "#fff",
          family: "Arial",
          outlineColor: "#f00",
          outlineWidth: 10,
          shadowBlur: 20,
          shadowColor: "#000000",
          style: "normal",
          size: 200,
          animations: [
            {
              time: 3,
              key: "position.x",
              value: -100,
            },
            {
              time: 5,
              key: "position.x",
              value: 100,
            },
          ],
        },
      ],
    },
    {
      id: "strip2",
      start: 2,
      layer: 0,
      length: 6,
      effects: [
        {
          id: "effect2",
          type: "Video",
          start: 10,
          position: {
            x: 10,
            y: -10,
            z: 0,
          },
          videoAssetId: "video1",
        },
      ],
    },
  ],
};

function findStripById(id: string, timeline: Timeline) {
  for (const strip of timeline.strips) {
    if (strip.id === id) {
      return strip;
    }
  }
  return null;
}

function findEffectById(id: string, timeline: Timeline) {
  for (const strip of timeline.strips) {
    for (const effect of strip.effects) {
      if (effect.id === id) {
        return effect;
      }
    }
  }
  return null;
}

function moveStrip(timeline: Ref<Timeline>) {
  return (id: string, start: number, length: number, layer?: number) => {
    const strip = findStripById(id, timeline.value);
    if (!strip) return;
    strip.start = start;
    strip.length = length;
    strip.layer = layer ?? strip.layer;
  };
}

function changeView(timeline: Ref<Timeline>) {
  return (start: number, end: number) => {
    if (start < 0) start = 0;
    if (end > timeline.value.length) end = timeline.value.length;
    if (end - start < 1) end = start + 1;
    timeline.value.start = start;
    timeline.value.end = end;
  };
}

function update(timeline: Ref<Timeline>) {
  return (time: number, jump = false) => {
    timeline.value.curent = time;

    for (let j = 0; j < timeline.value.strips.length; j++) {
      const strip = timeline.value.strips[j];
      let visible = false;
      if (
        timeline.value.curent > strip.start &&
        timeline.value.curent < strip.start + strip.length
      ) {
        visible = true;
      }

      for (let k = 0; k < strip.effects.length; k++) {
        const effect = strip.effects[k];
        if (isText(effect)) {
          const textObj = effectObjectMap.get(
            effect.id
          ) as TextStripEffectObject;
          if (textObj) {
            textObj.update(strip, effect, timeline.value.curent);
          }
        } else if (isVideo(effect)) {
          const videoObj = effectObjectMap.get(
            effect.id
          ) as VideoStripEffectObject;
          if (videoObj) {
            videoObj.update(
              strip,
              effect,
              timeline.value.curent,
              timeline.value.isPlay,
              jump
            );
          }
        } else {
          console.log("Unknown effect type");
        }
      }
    }
  };
}

export const effectObjectMap = new Map<string, EffectObject>();

function play(timeline: Ref<Timeline>) {
  return (state: boolean) => {
    timeline.value.isPlay = state;
  };
}

export function isText(effect: StripEffect): effect is TextStripEffect {
  return effect.type === "Text";
}

export function isVideo(effect: StripEffect): effect is VideoStripEffect {
  return effect.type === "Video";
}

import * as THREE from "three";
import { VideoStripEffect } from "../core/VideoStripEffect";
import { VideoStripEffectObject } from "../core/VideoStripEffectObject";
import { Strip } from "../core/Strip";

export const view: State = {
  scene: new THREE.Scene(),
  camera: new THREE.OrthographicCamera(0, 0, 200, 200),
};

export interface State {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  // renderer?: THREE.WebGLRenderer | null;
}

export function useTimeline() {
  const timeline = useState("timeline", () => initialTimelineState);

  onMounted(() => {
    for (const strip of timeline.value.strips) {
      for (const effect of strip.effects) {
        if (isText(effect)) {
          if (!effectObjectMap.has(effect.id)) {
            const textObj = new TextStripEffectObject(effect);
            effectObjectMap.set(effect.id, textObj);
            view.scene.add(textObj.obj);
          }
        } else if (isVideo(effect)) {
          if (!effectObjectMap.has(effect.id)) {
            const videoObj = new VideoStripEffectObject(effect);
            effectObjectMap.set(effect.id, videoObj);
            view.scene.add(videoObj.obj);
          }
        } else {
          console.warn("Unknown effect type: " + effect.type);
        }
      }
    }
  });

  return {
    timeline: readonly(timeline),
    moveStrip: moveStrip(timeline),
    changeView: changeView(timeline),
    update: update(timeline),
    play: play(timeline),

    selectStrip: ((state: Ref<Timeline>) => {
      return (ids: string[]) => {
        const strips = ids
          .map((id) => {
            return findStripById(id, state.value);
          })
          .filter((strip) => strip) as Strip[];
        state.value.selectedStrips = strips;
      };
    })(timeline),

    updateEffect: ((state: Ref<Timeline>) => {
      return (stripId: string, effect: StripEffect) => {
        const strip = findStripById(stripId, state.value);
        if (!strip) return;
        const index = strip.effects.findIndex((e) => e.id === effect.id);
        if (index === -1) return;
        strip.effects[index] = effect;
      };
    })(timeline),
  };
}
