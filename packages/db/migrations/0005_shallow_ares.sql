CREATE INDEX "conversations_listing" ON "conversations" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_lister" ON "listings" USING btree ("lister_id");--> statement-breakpoint
CREATE INDEX "messages_sender" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "reports_listing" ON "reports" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "swipes_listing" ON "swipes" USING btree ("listing_id");