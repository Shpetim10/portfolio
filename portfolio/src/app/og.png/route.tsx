import { ImageResponse } from "next/og";
import { getProfile, getSeo, isTodo } from "@/content";
import { isPublished } from "@/content/files";
import { color, MARGIN, OG_SIZE, ogOptions, publicImage, Sheet, SheetHeader, TitleBlock } from "@/seo/og";

/*
 * T15 · The homepage share card, /og.png: the card every page without its own
 * shares (src/seo/site.ts DEFAULT_OG). A drawing sheet with the owner's name in
 * the display face over the positioning line, the academic record in the title
 * block (seo.cardFacts) and the portrait framed on the right, as on the plaque.
 * The portrait is left off until its file is in /public.
 */

export const dynamic = "force-static";

const PHOTO_HEIGHT = OG_SIZE.height - MARGIN * 2;

export async function GET() {
  const profile = getProfile();
  const seo = getSeo();
  const { portrait } = profile;
  const photo =
    isPublished(portrait.src) && portrait.width > 0 ? await publicImage(portrait.src, "image/png") : null;
  const photoWidth = photo ? Math.round((PHOTO_HEIGHT * portrait.width) / portrait.height) : 0;
  const name = isTodo(profile.name) ? ["Portfolio"] : profile.name.split(" ");

  return new ImageResponse(
    <Sheet>
      <div style={{ display: "flex", flexGrow: 1, gap: 48 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            minWidth: 0,
          }}
        >
          <SheetHeader lead={profile.role} rest={[profile.location.split(",")[0]]} />
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontFamily: "Display",
                fontSize: 148,
                lineHeight: 0.86,
                textTransform: "uppercase",
              }}
            >
              {name.map((word) => (
                <span key={word}>{word}</span>
              ))}
            </div>
            {!isTodo(profile.positioning) && (
              <div
                style={{
                  display: "flex",
                  fontFamily: "Mono",
                  fontSize: 20,
                  lineHeight: 1.5,
                  color: color.dust,
                }}
              >
                {profile.positioning}
              </div>
            )}
          </div>
          <TitleBlock facts={seo.cardFacts} />
        </div>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by next/og, not the DOM
          <img
            src={photo}
            alt=""
            width={photoWidth}
            height={PHOTO_HEIGHT}
            style={{ flexShrink: 0, objectFit: "cover", border: `1px solid ${color.dust}` }}
          />
        )}
      </div>
    </Sheet>,
    await ogOptions(),
  );
}
