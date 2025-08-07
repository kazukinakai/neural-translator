# Contributing to Neural

Thank you for your interest in contributing to Neural! We love your input! We want to make contributing to this project as easy and transparent as possible.

## We Develop with Github

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [Github Flow](https://guides.github.com/introduction/flow/index.html)

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using Github's [issues](https://github.com/kazukinakai/neural/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/kazukinakai/neural/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Process

### Setting up your development environment

1. Install prerequisites:
   ```bash
   # Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Node.js 20+
   brew install node
   
   # Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/kazukinakai/neural.git
   cd neural
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Download AI models:
   ```bash
   ollama pull aya:8b
   ```

5. Start development:
   ```bash
   pnpm run tauri dev
   ```

### Code Style

- **TypeScript/JavaScript**: We use ESLint with Prettier
- **Rust**: We follow standard Rust formatting (rustfmt)
- **React**: Functional components with hooks
- **CSS**: Tailwind CSS utilities

Run formatting before committing:
```bash
pnpm run lint
pnpm run format
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test -- --grep "translation"

# Run with coverage
pnpm run test:coverage
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Changes that don't affect code meaning
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvement
- `test:` Adding missing tests
- `chore:` Changes to the build process or auxiliary tools

Examples:
```
feat: add support for Korean language
fix: resolve memory leak in translation cache
docs: update installation instructions
perf: optimize model loading time
```

## Areas We're Looking for Help

- **Windows/Linux Support**: Porting to other platforms
- **Language Models**: Adding support for more models
- **Performance**: Further optimization for different hardware
- **UI/UX**: Improving the user interface
- **Documentation**: Translations, tutorials, examples
- **Testing**: More comprehensive test coverage

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## References

This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/master/CONTRIBUTING.md)