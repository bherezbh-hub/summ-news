// Thin wrappers around the YouTube IFrame API and the Facebook embedded video
// player, exposing just what the synced TV screen needs.

import type { Source } from "./schedule";

export interface SyncPlayer {
  currentTime(): number | null;
  duration(): number | null;
  isPlaying(): boolean;
  seek(seconds: number): void;
  play(): void;
  setMuted(muted: boolean): void;
  /** Shows or hides the video's own subtitles, where the player has them. */
  setCaptions(on: boolean): void;
  destroy(): void;
}

export type PlayerEvents = {
  onReady: () => void;
  onError: () => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

let youTubeApi: Promise<any> | null = null;

export function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youTubeApi) {
    youTubeApi = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    });
  }
  return youTubeApi;
}

let facebookSdk: Promise<any> | null = null;

function loadFacebookSdk(): Promise<any> {
  if (window.FB?.XFBML) return Promise.resolve(window.FB);
  if (!facebookSdk) {
    facebookSdk = new Promise((resolve) => {
      window.fbAsyncInit = () => {
        window.FB.init({ xfbml: false, version: "v19.0" });
        resolve(window.FB);
      };
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/he_IL/sdk.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);
    });
  }
  return facebookSdk;
}

function createYouTubePlayer(id: string, mount: HTMLElement, startAt: number, events: PlayerEvents) {
  let player: any = null;
  let ready = false;
  let destroyed = false;
  const target = document.createElement("div");
  mount.appendChild(target);

  loadYouTubeApi().then((YT) => {
    if (destroyed) return;
    player = new YT.Player(target, {
      videoId: id,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        iv_load_policy: 3,
        start: Math.max(0, Math.floor(startAt)),
      },
      events: {
        onReady: () => {
          ready = true;
          events.onReady();
        },
        onError: () => events.onError(),
      },
    });
  });

  const handle: SyncPlayer = {
    currentTime: () => (ready ? player.getCurrentTime() : null),
    duration: () => {
      const d = ready ? player.getDuration() : 0;
      return d > 0 ? d : null;
    },
    isPlaying: () => ready && player.getPlayerState() === 1,
    seek: (s) => ready && player.seekTo(s, true),
    play: () => ready && player.playVideo(),
    setCaptions: (on) => {
      if (!ready) return;
      try {
        if (on) player.loadModule("captions");
        else player.unloadModule("captions");
      } catch {}
    },
    setMuted: (muted) => {
      if (!ready) return;
      if (muted) player.mute();
      else {
        player.unMute();
        player.setVolume(100);
      }
    },
    destroy: () => {
      destroyed = true;
      try {
        player?.destroy();
      } catch {}
      mount.innerHTML = "";
    },
  };
  return handle;
}

let facebookCounter = 0;

function createFacebookPlayer(href: string, mount: HTMLElement, events: PlayerEvents) {
  let instance: any = null;
  let playing = false;
  let destroyed = false;
  const elementId = `fb-video-${++facebookCounter}`;
  const el = document.createElement("div");
  el.id = elementId;
  el.className = "fb-video";
  el.dataset.href = href;
  el.dataset.width = "1280";
  el.dataset.autoplay = "true";
  el.dataset.allowfullscreen = "false";
  el.dataset.showText = "false";
  el.dataset.showCaptions = "false";
  mount.appendChild(el);

  const timeout = window.setTimeout(() => {
    if (!instance && !destroyed) events.onError();
  }, 20000);

  const onXfbmlReady = (msg: any) => {
    if (msg.type !== "video" || msg.id !== elementId || destroyed) return;
    window.clearTimeout(timeout);
    instance = msg.instance;
    instance.mute();
    instance.subscribe("startedPlaying", () => (playing = true));
    instance.subscribe("paused", () => (playing = false));
    instance.subscribe("finishedPlaying", () => (playing = false));
    instance.subscribe("error", () => events.onError());
    events.onReady();
  };

  loadFacebookSdk().then((FB) => {
    if (destroyed) return;
    FB.Event.subscribe("xfbml.ready", onXfbmlReady);
    FB.XFBML.parse(mount);
  });

  const handle: SyncPlayer = {
    currentTime: () => (instance ? instance.getCurrentPosition() : null),
    duration: () => {
      const d = instance ? instance.getDuration() : 0;
      return d > 0 ? d : null;
    },
    isPlaying: () => playing,
    seek: (s) => instance?.seek(s),
    play: () => instance?.play(),
    // The Facebook player has no subtitle control.
    setCaptions: () => {},
    setMuted: (muted) => {
      if (!instance) return;
      if (muted) instance.mute();
      else {
        instance.unmute();
        instance.setVolume(1);
      }
    },
    destroy: () => {
      destroyed = true;
      window.clearTimeout(timeout);
      window.FB?.Event?.unsubscribe("xfbml.ready", onXfbmlReady);
      mount.innerHTML = "";
    },
  };
  return handle;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createPlayer(
  source: Source,
  mount: HTMLElement,
  startAt: number,
  events: PlayerEvents,
): SyncPlayer {
  return source.type === "youtube"
    ? createYouTubePlayer(source.id, mount, startAt, events)
    : createFacebookPlayer(source.href, mount, events);
}
