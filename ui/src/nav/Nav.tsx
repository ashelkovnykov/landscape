import { DialogContent } from '@radix-ui/react-dialog';
import * as Portal from '@radix-ui/react-portal';
import classNames from 'classnames';
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  Link,
  LinkProps,
  Route,
  Switch,
  useHistory,
  useRouteMatch,
} from 'react-router-dom';
import create from 'zustand';
import { Avatar } from '../components/Avatar';
import { Dialog } from '../components/Dialog';
import { ErrorAlert } from '../components/ErrorAlert';
import { Help } from './Help';
import { Leap } from './Leap';
import { Notifications } from './notifications/Notifications';
import { NotificationsLink } from './notifications/NotificationsLink';
import { Search } from './Search';
import { SystemPreferences } from '../preferences/SystemPreferences';
import { useSystemUpdate } from '../logic/useSystemUpdate';
import { Bullet } from '../components/icons/Bullet';
import { Cross } from '../components/icons/Cross';

export interface MatchItem {
  url: string;
  openInNewTab: boolean;
  value: string;
  display?: string;
}

interface LeapStore {
  rawInput: string;
  searchInput: string;
  matches: MatchItem[];
  selectedMatch?: MatchItem;
  selection: React.ReactNode;
  select: (selection: React.ReactNode, input?: string) => void;
}

export const useLeapStore = create<LeapStore>((set) => ({
  rawInput: '',
  searchInput: '',
  matches: [],
  selectedMatch: undefined,
  selection: null,
  select: (selection: React.ReactNode, input?: string) =>
    set({
      rawInput: input || '',
      searchInput: input || '',
      selection,
    }),
}));

window.leap = useLeapStore.getState;

export type MenuState =
  | 'closed'
  | 'search'
  | 'notifications'
  | 'help-and-support'
  | 'system-preferences'
  | 'upgrading';

interface NavProps {
  menu?: MenuState;
}

type PrefsLinkProps = Omit<LinkProps<HTMLAnchorElement>, 'to'> & {
  menuState: string;
  systemBlocked?: string[];
};

export const SystemPrefsLink = ({
  menuState,
  systemBlocked,
}: PrefsLinkProps) => {
  const active = ['system-preferences'].indexOf(menuState) >= 0;

  if (active) {
    return (
      <Link
        to="/"
        className="circle-button h4 default-ring relative z-50 flex-none bg-gray-50"
      >
        <Cross className="h-3 w-3 fill-current" />
        <span className="sr-only">Close</span>
      </Link>
    );
  }

  return (
    <Link to="/leap/system-preferences" className="relative flex-none">
      <Avatar shipName={window.ship} size="nav" />
      {systemBlocked && (
        <Bullet
          className="absolute -top-2 -right-2 ml-auto h-5 w-5 text-orange-500"
          aria-label="System Needs Attention"
        />
      )}
    </Link>
  );
};

export const Nav: FunctionComponent<NavProps> = ({ menu }) => {
  const { push } = useHistory();
  const inputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const dialogNavRef = useRef<HTMLDivElement>(null);
  const systemMenuOpen = useRouteMatch('/leap/system-preferences');
  const { systemBlocked } = useSystemUpdate();
  const [dialogContentOpen, setDialogContentOpen] = useState(false);
  const select = useLeapStore((state) => state.select);

  const menuState = menu || 'closed';
  const isOpen = menuState !== 'upgrading' && menuState !== 'closed';

  useEffect(() => {
    if (!isOpen) {
      select(null);
      setDialogContentOpen(false);
    }
  }, [isOpen]);

  const onOpen = useCallback(
    (event: Event) => {
      event.preventDefault();

      setDialogContentOpen(true);
      if (menu === 'search' && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    },
    [menu]
  );

  const onDialogClose = useCallback((open: boolean) => {
    if (!open) {
      push('/');
    }
  }, []);

  const preventClose = useCallback((e) => {
    const target = e.target as HTMLElement;
    const hasNavAncestor = target.closest('#dialog-nav');

    if (hasNavAncestor) {
      e.preventDefault();
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorAlert} onReset={() => push('/')}>
      {/* Using portal so that we can retain the same nav items both in the dialog and in the base header */}
      <Portal.Root
        containerRef={dialogContentOpen ? dialogNavRef : navRef}
        className="flex w-full items-center justify-center space-x-2"
      >
        <SystemPrefsLink menuState={menuState} systemBlocked={systemBlocked} />
        <NotificationsLink
          navOpen={isOpen}
          notificationsOpen={menu === 'notifications'}
        />
        <Leap
          ref={inputRef}
          menu={menuState}
          dropdown="leap-items"
          navOpen={isOpen}
          systemMenuOpen={!!systemMenuOpen}
        />
      </Portal.Root>
      <div
        ref={navRef}
        className={classNames(
          'mx-auto my-6 w-full max-w-[712px] font-semibold text-gray-400',
          dialogContentOpen && 'h-9'
        )}
        role="combobox"
        aria-controls="leap-items"
        aria-owns="leap-items"
        aria-expanded={isOpen}
      />
      <Dialog open={isOpen} onOpenChange={onDialogClose}>
        <DialogContent
          onInteractOutside={preventClose}
          onOpenAutoFocus={onOpen}
          className="scroll-left-50 scroll-full-width outline-none fixed bottom-0 z-50 flex h-full max-h-full max-w-[882px] -translate-x-1/2 flex-col justify-end px-4 text-gray-400 sm:top-0 sm:bottom-auto sm:h-auto sm:justify-start sm:pb-4"
          role="combobox"
          aria-controls="leap-items"
          aria-owns="leap-items"
          aria-expanded={isOpen}
        >
          <header
            id="dialog-nav"
            ref={dialogNavRef}
            className="order-last mx-auto my-6 w-full max-w-[712px] sm:order-none sm:mb-3"
          />
          <div
            id="leap-items"
            className="default-ring mt-4 grid grid-rows-[fit-content(calc(100vh-6.25rem))] overflow-hidden rounded-xl bg-white focus-visible:ring-2 sm:mt-0"
            tabIndex={0}
            role="listbox"
          >
            <Switch>
              <Route path="/leap/notifications" component={Notifications} />
              <Route
                path="/leap/system-preferences"
                component={SystemPreferences}
              />
              <Route path="/leap/help-and-support" component={Help} />
              <Route path={['/leap/search', '/leap']} component={Search} />
            </Switch>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
};
