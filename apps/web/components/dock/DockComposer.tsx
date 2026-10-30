"use client";

import { useState } from "react";
import { ComposerPrimitive, type AssistantRuntime } from "@assistant-ui/react";
import { Mic, Send, Square } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePushToTalk } from "./hooks/use-push-to-talk.ts";

export function DockComposer({ busy, runtime }: { busy: boolean; runtime: AssistantRuntime }) {
  const [language, setLanguage] = useState("en-GB");
  const voice = usePushToTalk(
    (text) => {
      runtime.thread.composer.setText(text);
      runtime.thread.composer.send();
    },
    language,
    busy,
  );

  return (
    <>
      {voice.error ? (
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{voice.error}</AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
      <CardFooter className="grid">
        <ComposerPrimitive.Root>
          <InputGroup>
            <ComposerPrimitive.Input asChild>
              <InputGroupTextarea
                aria-label="Ask Medlyn a question"
                placeholder="Ask a question…"
                className="max-h-32 min-h-16"
              />
            </ComposerPrimitive.Input>
            <InputGroupAddon align="block-end" className="justify-end">
              {voice.supported ? (
                <>
                  <Select value={language} onValueChange={setLanguage} disabled={busy}>
                    <SelectTrigger size="sm" aria-label="Voice input language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="en-GB">English</SelectItem>
                        <SelectItem value="de-AT">Deutsch</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant={voice.listening ? "destructive" : "outline"}
                    size="icon-sm"
                    disabled={busy}
                    aria-label="Hold to talk"
                    aria-pressed={voice.listening}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      voice.start();
                    }}
                    onPointerUp={voice.stop}
                    onPointerCancel={voice.stop}
                    onLostPointerCapture={voice.stop}
                    onBlur={voice.stop}
                    onKeyDown={(event) => {
                      if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
                        event.preventDefault();
                        voice.start();
                      }
                    }}
                    onKeyUp={(event) => {
                      if (event.code === "Space" || event.code === "Enter") {
                        event.preventDefault();
                        voice.stop();
                      }
                    }}
                  >
                    <Mic />
                  </Button>
                </>
              ) : null}
              {busy ? (
                <ComposerPrimitive.Cancel asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Square data-icon="inline-start" />
                    Stop
                  </Button>
                </ComposerPrimitive.Cancel>
              ) : (
                <ComposerPrimitive.Send asChild>
                  <Button type="submit" size="sm">
                    <Send data-icon="inline-start" />
                    Ask
                  </Button>
                </ComposerPrimitive.Send>
              )}
            </InputGroupAddon>
          </InputGroup>
        </ComposerPrimitive.Root>
      </CardFooter>
    </>
  );
}
