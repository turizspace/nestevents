import { writable } from 'svelte/store';

export type SortOption = 'all' | 'today' | 'this-week' | 'this-weekend' | 'upcoming';

interface SortState {
    option: SortOption;
}

function createSortStore() {
    const { subscribe, set, update } = writable<SortState>({
        option: 'upcoming'
    });

    return {
        subscribe,
        setOption: (option: SortOption) => {
            update(state => ({ ...state, option }));
        },
        reset: () => set({ option: 'upcoming' })
    };
}

export const sortStore = createSortStore();
