# Contributing to Spliit

Thank you for your interest in contributing to Spliit! We welcome contributions from everyone.

## Ways to Contribute

- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Fix bugs and implement features
- 🌍 Add translations
- ✨ Improve UI/UX

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

### Setup Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/spliit.git
   cd spliit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Visit** http://localhost:3000

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `release` - Pre-release staging
- Feature branches: `feat/feature-name`
- Bug fixes: `fix/bug-description`

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic

3. **Test your changes**
   ```bash
   npm run build
   npm run test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `test:` Test changes
   - `chore:` Build process or auxiliary tool changes

5. **Push and create a Pull Request**
   ```bash
   git push origin feat/your-feature-name
   ```

   Then open a PR on GitHub with:
   - Clear description of changes
   - Screenshots (if UI changes)
   - Reference to related issues

## Code Style Guidelines

### TypeScript/React

- Use TypeScript for type safety
- Prefer functional components with hooks
- Use meaningful variable and function names
- Keep components small and focused
- Extract reusable logic into custom hooks

### File Organization

- Components: `src/components/`
- Pages: `src/app/`
- Utilities: `src/lib/`
- Types: Define inline or in separate `.d.ts` files

### CSS/Styling

- Use Tailwind CSS classes
- Follow existing spacing and color patterns
- Ensure mobile responsiveness
- Test dark mode compatibility

## Testing

- Write tests for new features
- Ensure existing tests pass
- Test on multiple browsers
- Test mobile responsiveness
- Test accessibility

## Documentation

### Updating Documentation

When adding features:

1. **User Documentation**
   - Update relevant files in `docs/user-guides/`
   - Add to FAQ if needed
   - Include screenshots/examples

2. **Technical Documentation**
   - Document complex implementations in `docs/technical/`
   - Add inline code comments
   - Update README if needed

3. **Translations**
   - Add new text to `messages/en-US.json`
   - Other languages can be translated by community

## Adding Translations

1. Open `messages/en-US.json`
2. Add your new keys following existing patterns
3. Copy to other language files in `messages/`
4. Translate or leave for community contribution
5. Use in code: `const t = useTranslations('YourKey')`

## Database Changes

When modifying the database schema:

1. Edit `prisma/schema.prisma`
2. Create migration:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
3. Test migration on clean database
4. Document any breaking changes

## Pull Request Guidelines

### Before Submitting

- [ ] Code builds without errors
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] Follows code style guidelines
- [ ] Documentation updated
- [ ] Commit messages follow conventions

### PR Description Should Include

- What changes were made
- Why the changes were needed
- How to test the changes
- Screenshots (for UI changes)
- Related issues (closes #123)

### Review Process

- Maintainers will review your PR
- Address feedback and requested changes
- Once approved, your PR will be merged
- Your contribution will be credited!

## Reporting Bugs

### Before Reporting

- Check if the bug was already reported
- Try to reproduce on latest version
- Check if it happens in different browsers

### Bug Report Should Include

- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/videos if applicable
- Browser and OS information
- Console errors (if any)

## Suggesting Features

### Good Feature Requests Include

- Clear description of the feature
- Use cases and benefits
- Potential implementation approach (optional)
- Mockups or examples (if applicable)

## Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Celebrate others' contributions
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)

## Questions?

- Open a [GitHub Discussion](https://github.com/carnach/spliit/discussions)
- Check existing [Issues](https://github.com/carnach/spliit/issues)
- Read the [documentation](docs/README.md)

## Recognition

Contributors are recognized in:
- GitHub's contributor graph
- Release notes
- Project README

Thank you for contributing to Spliit! 🎉
