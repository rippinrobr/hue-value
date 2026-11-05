// Steps and panels use the browser's history, so the phone's back gesture works as expected.
import { pushState } from '$app/navigation';
import { page } from '$app/state';

export type Step = NonNullable<App.PageState['step']>;
export type Panel = NonNullable<App.PageState['overlay']>;

export const goToStep = (step: Step) => pushState('', { step });
export const startOver = () => pushState('', {});
export const openPanel = (overlay: Panel) => pushState('', { step: page.state.step, overlay });
export const closePanel = () => history.back();
