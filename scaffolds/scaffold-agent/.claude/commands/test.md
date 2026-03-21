# Run Tests

Execute tests for $ARGUMENTS with optional coverage.

## Process

1. Detect test framework (vitest, jest, etc.)
2. Run tests matching the target
3. Collect and display results
4. Generate coverage report if requested

## Options

- `--coverage`: Include coverage report
- `--watch`: Run in watch mode
- `--filter <pattern>`: Run only matching tests
- `--verbose`: Show detailed output

## Test Types

- **Unit**: Test individual functions/modules
- **Integration**: Test module interactions
- **E2E**: Test full user flows

## Output

Test results include:
- Pass/fail status
- Duration
- Error messages for failures
- Coverage metrics (if enabled)

## Usage

```
/test
/test src/core --coverage
/test --filter "auth"
/test --watch
```
