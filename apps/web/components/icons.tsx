import type { Icon, IconProps } from "@phosphor-icons/react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  Cards,
  Check,
  DotsThree,
  GithubLogo,
  HandSwipeRight,
  Heart,
  Info,
  Key,
  MapPin,
  NavigationArrow,
  PaperPlaneRight,
  SlidersHorizontal,
  Star,
  Trash,
  User,
  X,
} from "@phosphor-icons/react/dist/ssr";

/*
 * The app's icons, from Phosphor. Every icon is imported from this file, under
 * our own name, so the whole set can be restyled or swapped in one place.
 *
 * Icons are decorative (aria-hidden); the button or link that holds one carries
 * the label. Size them with a class such as `size-6`. Pass `weight="fill"` for
 * the lit version of a tab icon.
 */
function themed(Glyph: Icon) {
  return function ThemedIcon(props: IconProps) {
    return <Glyph aria-hidden="true" weight="bold" {...props} />;
  };
}

export const ArrowLeftIcon = themed(ArrowLeft);
export const ArrowRightIcon = themed(ArrowRight);
export const BookmarkIcon = themed(BookmarkSimple);
export const CardsIcon = themed(Cards);
export const CheckIcon = themed(Check);
export const CrossIcon = themed(X);
export const FiltersIcon = themed(SlidersHorizontal);
export const GithubIcon = themed(GithubLogo);
export const HeartIcon = themed(Heart);
export const InfoIcon = themed(Info);
export const DirectionsIcon = themed(NavigationArrow);
export const KeyIcon = themed(Key);
export const MapPinIcon = themed(MapPin);
export const MoreIcon = themed(DotsThree);
export const SendIcon = themed(PaperPlaneRight);
export const StarIcon = themed(Star);
export const SwipeIcon = themed(HandSwipeRight);
export const TrashIcon = themed(Trash);
export const UndoIcon = themed(ArrowCounterClockwise);
export const UserIcon = themed(User);
