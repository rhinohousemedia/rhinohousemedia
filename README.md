# Rhino House Media

Static site. No build step, no framework, no dependencies.

## Files

```
index.html      markup
styles.css      the stylesheet, lifted verbatim from the preview build
main.js         binder entry, reveal observers, scroll parallax, pointer lighting
media/          binder-desktop.png, binder-mobile.png, platform-emblems.png, rhino-emblem.jpeg
```

## Deploy on Vercel

1. Copy these files into the root of your existing repo, replacing the old site.
2. Delete any leftover build config from the previous version: `package.json`,
   `vite.config.*`, `next.config.*`, `wrangler.*`, `vercel.json`, `/dist`, `/public`.
   If Vercel finds one of those it will try to run a build and fail.
3. In Vercel, set the project's Framework Preset to **Other**. Leave Build Command
   and Output Directory empty. Root Directory stays `./`.
4. Commit and push. Vercel serves `index.html` from the root.

To check it locally before pushing:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Open it through a server, not by double-clicking
the file, because the CSS and JS use absolute paths.

## Editing

- Copy lives in `index.html`. Nothing is generated at runtime.
- Social links are the four `<a class="platform ...">` tags in the footer.
- Email is in two places inside `.email-plaque`: the `href` and both plaque faces
  (front and back). Change all three or the spinning plaque will read wrong on one side.
- Phone number is in the `.agent-contact` `href` (`tel:+1...`) and in `.agent-number`.
- `styles.css` is minified output from the original build. Search by class name.

## Notes

The four images total about 6.9 MB, and `binder-desktop.png` / `binder-mobile.png`
load before anything else is visible. Compressing them to WebP would cut that
substantially without changing the design.
