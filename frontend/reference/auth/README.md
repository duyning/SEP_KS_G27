# Original Authentication Sources

These files are byte-for-byte copies of the existing login/register prototype.
They remain inside the HL-RCS project for design reference and future migration.

```text
html/login.html
html/register.html
css/styles.css
js/app.js
js/register.js
manifest.json
```

Both HTML files retain their inline styles, scripts, SVG icons, and relative
CSS/JS paths. The shared stylesheet and both scripts are included without edits.
The manifest records the original workspace paths and SHA-256 checksums.
Original files outside this project have not been deleted or modified.

External resources are still referenced by their original URLs:

- Google Fonts: Plus Jakarta Sans (fonts.googleapis.com and fonts.gstatic.com).
- Login photo: https://images.unsplash.com/photo-1522708323590-d24dbb6b0267
- Register photo: https://images.unsplash.com/photo-1502672260266-1c1ef2d93688

These resources require internet access; no local image or font files existed
in the original pages. Navigation to other prototype pages is not a dependency
of these authentication forms and those unrelated pages are not copied here.

## Runtime Boundary

This directory is not a Vite entry point, public asset directory, or Spring Boot
static directory. Do not import the original scripts into the React application:
they manipulate the DOM and simulate authentication using localStorage.
Their contents are preserved, but they are not the active authentication logic.

The active application uses React components in src/components and src/pages,
styles in src/styles, and API/session handling in src/services and src/context.
Login and registration continue to use Spring Boot and MySQL. No old HTML
interface has been restored to the backend.
