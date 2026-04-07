/**
 * Polls an async assertion until it passes or the timeout is reached.
 * On timeout, the final assertion error is thrown.
 */
export async function waitFor(
    assertion: () => Promise<void>,
    timeout = 3000,
    interval = 50,
): Promise<void> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        try {
            await assertion();
            return;
        } catch {
            await new Promise((r) => setTimeout(r, interval));
        }
    }
    // Final attempt to throw the real error
    await assertion();
}
