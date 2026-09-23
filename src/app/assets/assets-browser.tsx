"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useApp } from "@/components/app-provider";
import { stashDraft } from "@/components/composer/handoff";
import { FannedStack } from "@/components/fanned-stack";
import { FavouriteButton, useFavourite } from "@/components/favourite-button";
import {
  AudioIcon,
  BoxIcon,
  DownloadIcon,
  GridIcon,
  HeartIcon,
  ImageIcon,
  ReuseIcon,
  SearchIcon,
  SparkleIcon,
  VideoIcon,
  XIcon,
} from "@/components/icons";
import { Lightbox } from "@/components/lightbox";
import { useT } from "@/components/locale-provider";
import { DEFAULT_ASPECT, DEFAULT_MODEL, isAspectId, isModelId, type AspectId, type ModelId } from "@/lib/credits";
import { download } from "@/lib/download";
import { tParts, type MessageKey } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "generations";
const LIMIT = 500;

type AssetRow = {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  favourite: boolean;
  created_at: string;
  generations: { prompt: string; model: string; aspect: string } | null;
};

type Asset = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  prompt: string;
  model: ModelId;
  aspect: AspectId;
  favourite: boolean;
};

type Filter = "all" | "favourites" | "image";

const TITLES: Record<Filter, MessageKey> = {
  all: "assets.title.all",
  favourites: "assets.title.favourites",
  image: "assets.title.image",
};

// Mobile is always 2 columns; the slider sets the widest breakpoint's count. Full strings for Tailwind.
const COLUMNS: Record<number, string> = {
  2: "columns-2",
  3: "columns-2 sm:columns-3",
  4: "columns-2 sm:columns-3 lg:columns-4",
  5: "columns-2 sm:columns-3 lg:columns-4 xl:columns-5",
  6: "columns-2 sm:columns-3 lg:columns-4 xl:columns-6",
};

const ASPECT_CLASS: Record<AspectId, string> = {
  "1:1": "aspect-square",
  "3:4": "aspect-3/4",
  "4:3": "aspect-4/3",
  "9:16": "aspect-9/16",
  "16:9": "aspect-video",
};

const SKELETON: AspectId[] = ["16:9", "3:4", "1:1", "9:16", "4:3", "16:9", "3:4", "1:1", "16:9", "9:16"];

// RLS returns only the caller's rows. No session means the visitor hasn't generated yet, so no gallery.
async function loadAssets(): Promise<Asset[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return [];

  const { data, error } = await supabase
    .from("assets")
    .select("id, storage_path, width, height, favourite, created_at, generations(prompt, model, aspect)")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw error;

  return (data as unknown as AssetRow[]).map((row) => ({
    id: row.id,
    url: supabase.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
    width: row.width,
    height: row.height,
    prompt: row.generations?.prompt ?? "",
    model: isModelId(row.generations?.model) ? row.generations.model : DEFAULT_MODEL,
    aspect: isAspectId(row.generations?.aspect) ? row.generations.aspect : DEFAULT_ASPECT,
    favourite: row.favourite,
  }));
}

export function AssetsBrowser() {
  const router = useRouter();
  const { account, openAuthModal } = useApp();
  const t = useT();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [columns, setColumns] = useState(4);
  // An id, not a snapshot, so a heart clicked inside the lightbox shows the live value.
  const [openId, setOpenId] = useState<string | null>(null);
  const setFavourite = useFavourite((id, favourite) =>
    setAssets((current) => current?.map((a) => (a.id === id ? { ...a, favourite } : a)) ?? null),
  );

  useEffect(() => {
    let cancelled = false;
    loadAssets()
      .then((rows) => {
        if (!cancelled) setAssets(rows);
      })
      .catch((err) => {
        console.error("Loading assets failed", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const count = assets?.length ?? null;
  const favourites = assets?.filter((a) => a.favourite) ?? [];
  // Unhearting in the Favourites view drops the tile straight away; a failed save brings it back.
  const base = filter === "favourites" ? favourites : (assets ?? []);
  const needle = query.trim().toLowerCase();
  const visible = base.filter((a) => !needle || a.prompt.toLowerCase().includes(needle));
  const open = assets?.find((a) => a.id === openId) ?? null;
  const memberNote = tParts(t, "assets.memberNote", "email");

  function reuse(asset: Asset) {
    // A draft only fills the composer on /image; it never starts a generation.
    stashDraft({ prompt: asset.prompt, model: asset.model, aspect: asset.aspect, batch: 1 });
    router.push("/image");
  }

  function retry() {
    setFailed(false);
    setAssets(null);
    setAttempt((n) => n + 1);
  }

  return (
    <>
      <aside className="shrink-0 lg:w-64">
        <div className="flex flex-col gap-4 rounded-2xl border border-border-2 bg-bg-1 p-3 lg:sticky lg:top-28">
          <label className="relative block">
            <span className="sr-only">{t("assets.searchLabel")}</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("assets.searchPlaceholder")}
              className="h-10 w-full rounded-lg border border-border-3 bg-bg-3 pr-3 pl-9 text-sm text-text-1 outline-none placeholder:text-text-placeholder focus-visible:border-accent/50"
            />
          </label>

          <nav aria-label={t("assets.library")} className="flex flex-col gap-4">
            <ul className="flex gap-1 max-lg:overflow-x-auto lg:flex-col">
              <SidebarItem icon={<BoxIcon />} label={t("nav.assets")} count={count} active={filter === "all"} onClick={() => setFilter("all")} />
              <SidebarItem
                icon={<HeartIcon />}
                label={t("assets.title.favourites")}
                count={assets ? favourites.length : null}
                active={filter === "favourites"}
                onClick={() => setFilter("favourites")}
              />
            </ul>
            <div className="max-lg:hidden">
              <p className="px-2.5 pb-1.5 text-xs font-medium text-text-3">{t("assets.tools")}</p>
              <ul className="flex flex-col gap-1">
                <SidebarItem
                  icon={<ImageIcon />}
                  label={t("nav.image")}
                  count={count}
                  active={filter === "image"}
                  onClick={() => setFilter("image")}
                />
                <SidebarItem icon={<VideoIcon />} label={t("nav.video")} soon />
                <SidebarItem icon={<AudioIcon />} label={t("nav.audio")} soon />
              </ul>
            </div>
          </nav>

          {/* Anonymous galleries live in this browser's session; saying so beats a surprise after clearing cookies. */}
          {account?.status === "member" ? (
            <div className="rounded-xl bg-bg-2 p-3 text-xs leading-5 text-text-2 max-lg:hidden">
              {memberNote[0]}
              <span className="break-all text-text-1">{account.email}</span>
              {memberNote[1]}
            </div>
          ) : (
            <div className="rounded-xl bg-bg-2 p-3 text-xs leading-5 text-text-2 max-lg:hidden">
              {t("assets.guestNote")}
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className="mt-1 block font-semibold text-accent-text transition-colors duration-150 hover:text-accent-hover"
              >
                {t("auth.signup")}
              </button>
            </div>
          )}
        </div>
      </aside>

      <section aria-labelledby="assets-title" className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex min-h-10 items-center justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <h1 id="assets-title" className="text-xl font-semibold tracking-[-0.01em]">
              {t(TITLES[filter])}
            </h1>
            {base.length > 0 && (
              <span className="text-sm text-text-2 tabular-nums">
                {needle
                  ? t("assets.countFiltered", { shown: visible.length, n: base.length })
                  : t("assets.count", { n: base.length })}
              </span>
            )}
          </div>
          {count !== null && count > 0 && (
            <label className="flex h-10 items-center gap-3 rounded-lg border border-border-2 bg-bg-1 px-3 max-lg:hidden">
              <GridIcon className="size-4 text-text-2" />
              <span className="sr-only">{t("assets.columns")}</span>
              <input
                type="range"
                min={2}
                max={6}
                step={1}
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="w-28 cursor-pointer accent-accent"
              />
              <span className="w-3 text-xs text-text-2 tabular-nums">{columns}</span>
            </label>
          )}
        </div>

        {failed ? (
          <State title={t("assets.failed.title")} text={t("assets.failed.text")}>
            <button type="button" onClick={retry} className={WHITE_BUTTON}>
              {t("thread.tryAgain")}
            </button>
          </State>
        ) : assets === null ? (
          <ul aria-label={t("assets.loading")} className={`${COLUMNS[columns]} gap-1.5`}>
            {SKELETON.map((aspect, i) => (
              <li
                key={i}
                className={`mb-1.5 break-inside-avoid rounded-lg bg-bg-2 motion-safe:shimmer motion-safe:animate-shimmer ${ASPECT_CLASS[aspect]}`}
              />
            ))}
          </ul>
        ) : assets.length === 0 ? (
          <State
            stack
            title={t("assets.empty.title")}
            text={t("assets.empty.text")}
          >
            <Link href="/image" className={WHITE_BUTTON}>
              <SparkleIcon className="size-4" />
              {t("composer.generate")}
            </Link>
          </State>
        ) : base.length === 0 ? (
          <State title={t("assets.noFav.title")} text={t("assets.noFav.text")}>
            <button type="button" onClick={() => setFilter("all")} className={WHITE_BUTTON}>
              <BoxIcon className="size-4" />
              {t("assets.showAll")}
            </button>
          </State>
        ) : visible.length === 0 ? (
          <State title={t("assets.noMatch.title")} text={t("assets.noMatch.text", { query: query.trim() })}>
            <button type="button" onClick={() => setQuery("")} className={WHITE_BUTTON}>
              <XIcon className="size-4" />
              {t("assets.clearSearch")}
            </button>
          </State>
        ) : (
          <ul aria-label={t("assets.yourImages")} className={`${COLUMNS[columns]} gap-1.5`}>
            {visible.map((asset) => (
              <AssetTile
                key={asset.id}
                asset={asset}
                onOpen={() => setOpenId(asset.id)}
                onReuse={() => reuse(asset)}
                onFavourite={(favourite) => void setFavourite(asset.id, favourite, asset.favourite)}
              />
            ))}
          </ul>
        )}
      </section>

      <Lightbox
        item={open && { image: open, prompt: open.prompt }}
        onClose={() => setOpenId(null)}
        favourite={
          open
            ? { value: open.favourite, onChange: (favourite) => void setFavourite(open.id, favourite, open.favourite) }
            : undefined
        }
      />
    </>
  );
}

const WHITE_BUTTON =
  "flex h-9 items-center gap-2 rounded-md bg-white px-3.5 text-sm font-semibold text-black transition-colors duration-150 hover:bg-white/85";

function SidebarItem({
  icon,
  label,
  count,
  active = false,
  soon = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count?: number | null;
  active?: boolean;
  soon?: boolean;
  onClick?: () => void;
}) {
  const t = useT();
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={soon}
        aria-current={active ? "page" : undefined}
        className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 [&>svg]:size-4 ${
          active ? "bg-bg-3 text-text-1" : "text-text-2 hover:bg-bg-2 hover:text-text-1"
        } disabled:text-text-disabled disabled:hover:bg-transparent`}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {soon ? (
          <span className="flex h-4 items-center rounded-xs bg-accent-badge-bg px-1 text-[10px] leading-3 font-semibold text-accent-text">
            {t("nav.soon")}
          </span>
        ) : (
          <span className="min-w-5 rounded-sm bg-bg-2 px-1.5 text-center text-xs text-text-2 tabular-nums">
            {count ?? "–"}
          </span>
        )}
      </button>
    </li>
  );
}

function State({
  title,
  text,
  stack = false,
  children,
}: {
  title: string;
  text: string;
  stack?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      {stack && (
        <div className="mb-2">
          <FannedStack size="small" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold">{title}</p>
        <p className="text-sm text-text-2">{text}</p>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

const TILE_BUTTON =
  "pointer-events-auto flex h-8 items-center gap-1.5 rounded-md bg-black/50 px-2.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/75";

function AssetTile({
  asset,
  onOpen,
  onReuse,
  onFavourite,
}: {
  asset: Asset;
  onOpen: () => void;
  onReuse: () => void;
  onFavourite: (favourite: boolean) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const t = useT();
  const sized = asset.width !== null && asset.height !== null;

  return (
    <li className="mb-1.5 break-inside-avoid">
      <div className="group relative overflow-hidden rounded-lg bg-bg-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- final JPEG in public Storage; the optimizer would only re-encode it */}
        <img
          src={asset.url}
          alt={asset.prompt}
          width={asset.width ?? undefined}
          height={asset.height ?? undefined}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`block h-auto w-full transition-[scale,opacity] duration-300 ease-out motion-safe:group-hover:scale-[1.02] ${
            sized ? "" : ASPECT_CLASS[asset.aspect]
          } ${loaded ? "opacity-100" : "opacity-0"}`}
        />
        <button type="button" onClick={onOpen} aria-label={t("tile.open")} className="absolute inset-0 cursor-zoom-in" />
        {/* A hearted image keeps its heart showing, so favourites are visible at a glance in "All assets". */}
        <div
          className={`absolute top-2 right-2 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 ${
            asset.favourite ? "opacity-100" : "opacity-0"
          }`}
        >
          <FavouriteButton favourite={asset.favourite} onChange={onFavourite} className="size-8" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2.5 bg-linear-to-t from-black/85 via-black/45 to-transparent p-3 pt-12 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:bg-none pointer-coarse:pt-3 pointer-coarse:opacity-100">
          <p className="line-clamp-2 text-xs leading-4 text-white/90 pointer-coarse:hidden">{asset.prompt}</p>
          <div className="flex gap-1.5">
            <button type="button" onClick={onReuse} title={t("assets.reuseTitle")} className={TILE_BUTTON}>
              <ReuseIcon className="size-3.5" />
              {t("thread.reuse")}
            </button>
            <button
              type="button"
              onClick={() => void download(asset.url, `image-${asset.id.slice(0, 8)}.jpg`)}
              aria-label={t("tile.download")}
              className={`${TILE_BUTTON} px-2`}
            >
              <DownloadIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
