# Replace the Rhino House Media Contact panel

Use the Contact Swap download for the current GitHub site. The ready-to-upload files are based on the `index.html` and `studio.js` served by `www.rhinohousemedia.com` when the package was prepared.

## Install with GitHub and Vercel

1. Unzip `Rhino_House_Contact_Swap.zip`. Open the GitHub repository connected to your Rhino House Media project in Vercel.
2. In GitHub, create a branch named `soundstage-contact`. Find the folder that already has **both** `index.html` and `studio.js`. If they are at the root, stay there. If your site serves them from `dist/`, open `dist/`.
3. Choose **Add file → Upload files**. Upload the **contents** of `Site_Files`, which are `index.html`, `studio.js` and the full `soundstage/` folder. Keep the folder structure. Confirm that `soundstage/assets/soundstage.glb` sits next to `soundstage/src/entry.js` in the same folder tree. Commit to the new branch.
4. Open the branch's Vercel preview and go to `/#contact`. Test Instagram, YouTube and Call. On a phone, swipe to the adjacent sections and back, and check that the buttons clear the bottom navigation.
5. Merge the branch into the production branch after the preview looks right. Check the Contact panel on your regular domain.

The button row uses your existing destinations.

| Button | Destination |
|---|---|
| Instagram | [@rhinohousetv](https://www.instagram.com/rhinohousetv/) |
| YouTube | [@rhinohousemedia](https://www.youtube.com/@rhinohousemedia) |
| Call | `tel:+19179056533` (917-905-6533) |

The social links open in a new tab. The phone link opens the available dialer or calling app. The real-time scene starts when the Contact panel is visible, pauses when you leave it and includes a still fallback.

## If you have newer edits in your GitHub files

Use the targeted edits below to preserve those changes.

1. Copy the `soundstage/` folder from `Site_Files` into the folder serving your current `index.html`.
2. In `index.html`, replace the single `<section id="contact" …>` through its closing `</section>` with the contents of `Contact_Panel.html`. Keep the existing Contact navigation items and their `#contact` links.
3. In the head of `index.html`, remove the references to `contact-room.css` and `contact-motion.js`. Add these lines in their place.

```html
<link rel="stylesheet" href="./soundstage/stage.css?v=3">
<script type="module" src="./soundstage/src/entry.js?v=2"></script>
```

4. In `studio.js`, change `document.querySelector("#copy-email").addEventListener(` to `document.querySelector("#copy-email")?.addEventListener(`. The old button is gone with the cube layout. Increase the version query on the `studio.js` reference in `index.html` so browsers fetch the updated script.
5. Commit, check the branch preview and merge as described above.
