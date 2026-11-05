// Steps and panels use the browser's history, so the phone's back gesture works as expected.
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';

export type Step = NonNullable<App.PageState['step']>;
export type Panel = NonNullable<App.PageState['overlay']>;

// Shallow: the study stays at the home address, so changing step never reloads it.
const shallow = (state: App.PageState) => goto(resolve('/'), { state, shallow: true });

export const goToStep = (step: Step) => shallow({ step });
export const startOver = () => shallow({});
export const openPanel = (overlay: Panel) => shallow({ step: page.state.step, overlay });
export const closePanel = () => history.back();
