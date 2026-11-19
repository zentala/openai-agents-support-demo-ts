"use client";

/**
 * Draws one `data-widget` part of a chat message. The widget `type` decides the component; the TypeScript
 * `switch` is exhaustive, so adding a widget type to lib/types.ts fails the build until it is drawn here.
 */
import type { ChatWidget as Widget } from "@/lib/types";
import { AddressConfirm } from "./address-confirm";
import { OrderPicker } from "./order-picker";
import { PhotoUpload } from "./photo-upload";
import { SecureForm } from "./secure-form";
import type { WidgetActions } from "./widget-actions";
import { QuickReplies } from "./quick-replies";

type Props = {
  widget: Widget;
  /** True for the newest message while the agent is idle: older cards are history. */
  active: boolean;
  /** True while the agent is idle. A card that waits for a decision (address change) stays live after newer messages. */
  idle: boolean;
  /** Order stored in the run context, highlighted in the picker. */
  selectedOrderId?: string;
  actions: WidgetActions;
};

export function ChatWidget({ widget, active, idle, selectedOrderId, actions }: Props) {
  switch (widget.type) {
    case "quick-replies":
      return <QuickReplies widget={widget} active={active && idle} actions={actions} />;
    case "order-picker":
      return <OrderPicker widget={widget} selectedOrderId={selectedOrderId} active={active} onPick={actions.onPickOrder} />;
    case "secure-form":
      return <SecureForm widget={widget} actions={actions} />;
    case "photo-upload":
      return <PhotoUpload widget={widget} actions={actions} />;
    case "address-confirm":
      return <AddressConfirm widget={widget} active={idle} actions={actions} />;
  }
}
