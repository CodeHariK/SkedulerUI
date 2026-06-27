import { createContext, useContext } from 'react';

// Coordinates the click-mode event detail popovers: only one may be open at a
// time, and clicking outside any card/popover closes it. ResourceScheduler owns
// the state and provides it; EventCard consumes it.
type DetailOpenContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

export const DetailOpenContext = createContext<DetailOpenContextValue>({
  openId: null,
  setOpenId: () => {},
});

export const useDetailOpen = () => useContext(DetailOpenContext);
