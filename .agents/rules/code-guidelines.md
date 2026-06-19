---
trigger: always_on
---

* If a requested component (like an accordion, carousel, or sheet) is missing from the @/components/uidirectory, you must runnpx shadcn@latest add  to install it. Do not attempt to write the primitive wrapper from scratch.

* When extending or passing styles down to shadcn components, never use raw string interpolation for conditional Tailwind classes. You must always wrap class strings inside the cn()utility function. Keep custom theme styling aligned with CSS variables defined inglobals.css(e.g., usebg-sidebar, text-muted-foreground).

* Most shadcn/ui components require client-side interactivity. If you are composing an interface inside a Next.js Server Component, do not mark the entire page as 'use client'. Instead, extract the UI wrapper or interaction layer into a dedicated client component file.

* Component Size Limit:** Keep React components small, focused, and single-purpose. If a component exceeds 100 lines of code, evaluate it for sub-component extraction. Extract repetitive UI patterns, loops (e.g., inside .map()), or distinct layout sections (like headers, sidebars, or complex grid items) into localized sub-components at the bottom of the file, or into a components/ sub-folder if they require re-use.

* DRY Extraction:** If a UI pattern, layout block, or element array is rendered more than once within the same layout or across different views, you **must** extract it into a reusable, configurable component. Ensure variations are handled via explicit TypeScript props (e.g., passing unique variants, labels, or event handlers) rather than duplicating blocks of JSX.


* No Raw HTML Elements: Do not use raw semantic HTML elements for interactive, structural, or form-related UI if a shadcn equivalent exists. You must map raw tags to shadcn primitives as follows:
Use <Button> instead of <button>
Use <Input> or <Textarea> instead of <input> or <textarea>
Use <Badge> instead of <span> for labels/tags
Use <Separator> instead of <hr>
Use <Table>, <TableHeader>, etc., instead of <table>
If a requested shadcn component isn't present in @/components/ui/, install it using the CLI tool/MCP server immediately rather than using fallback HTML.

