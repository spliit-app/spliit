# CRUSH.md

## Build, Lint, and Test Commands
- **Build the project**: `npm run build`
- **Start the project**: `npm run start`
- **Run the project in development**: `npm run dev`
- **Lint the project**: `npm run lint`
- **Check types**: `npm run check-types`
- **Format code**: `npm run prettier`
- **Test the project**: `npm run test`
- **Run a single test**: Use Jest's `-t` option, e.g., `npm run test -- -t 'test name'`

## Code Style Guidelines

### Import Conventions
- Use `import` statements for importing modules.
- Organize imports using **prettier-plugin-organize-imports**.
- Import globals from libraries before local modules.

### Formatting
- Use **Prettier** for code formatting.
- Adhere to a line width of 80 characters where possible.
- Use 2 spaces for indentation.

### Types
- Utilize TypeScript for static typing throughout the codebase.
- Define interfaces and types for complex objects.

### Naming Conventions
- Use camelCase for variable and function names.
- Use PascalCase for component and type/interface names.

### Error Handling
- Use `try...catch` blocks for async functions.
- Handle errors gracefully and log them where required.

### Miscellaneous
- Ensure all new components are functional components.
- Prefer arrow functions for component definition.
- Use hooks like `useEffect` and `useState` for managing component state.

---

**Note**: Please follow these guidelines to maintain consistency and quality within the codebase.
