import { expect, type Locator, type Page } from '@playwright/test';

async function settleSpatialMarkerLayout(marker: Locator) {
  await marker.evaluate(async (element) => {
    const stage = element.closest('.sc-map-stage');
    if (stage) {
      await Promise.all(stage.getAnimations({ subtree: true }).map(async (animation) => {
        try {
          await animation.finished;
        } catch {
          // A superseded map transform is followed by the stable frames below.
        }
      }));
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

export async function ensureSpatialMarkerInteractive(
  page: Page,
  sourceNumber: number,
  activation: 'pointer' | 'keyboard' = 'pointer'
): Promise<Locator> {
  const marker = page.getByTestId(`spatial-command-marker-${sourceNumber}`);
  if (await marker.getAttribute('data-pointer-interactive') === 'true') return marker;

  const clusterId = await marker.getAttribute('data-cluster-id');
  if (!clusterId) throw new Error(`Marker ${sourceNumber} is not interactive and has no cluster.`);
  const cluster = page.getByTestId(clusterId);
  await expect(cluster).toBeVisible();
  const firstCandidateEntityId = (await cluster.getAttribute('data-contained-entity-ids'))?.split(' ')[0];
  if (activation === 'keyboard') {
    await cluster.focus();
    await cluster.press('Enter');
  } else {
    const box = await cluster.boundingBox();
    if (!box) throw new Error(`Cluster ${clusterId} has no pointer rectangle.`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await expect(marker).toHaveAttribute('data-pointer-interactive', 'true');
  await expect(marker).toBeVisible();
  if (firstCandidateEntityId) {
    await expect(page.locator(`[data-candidate-id="${firstCandidateEntityId}"]`)).toBeFocused();
  }
  return marker;
}

export async function clickSpatialMarkerCenter(page: Page, sourceNumber: number): Promise<Locator> {
  const marker = await ensureSpatialMarkerInteractive(page, sourceNumber);
  await settleSpatialMarkerLayout(marker);
  const box = await marker.boundingBox();
  if (!box) throw new Error(`Marker ${sourceNumber} has no pointer rectangle.`);
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hitTarget = await page.evaluate(({ x, y }) => (
    document.elementFromPoint(x, y)?.closest('button')?.getAttribute('data-testid') ?? null
  ), center);
  expect(hitTarget).toBe(`spatial-command-marker-${sourceNumber}`);
  await page.mouse.click(center.x, center.y);
  return marker;
}
