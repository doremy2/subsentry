// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DropZone } from "./DropZone";
import { ImportView } from "./ImportView";
import { appValue, csvFile, failingClient, mockClient, withApp } from "./testUtils";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const chooseFile = (file: File) => fireEvent.change(screen.getByLabelText("Choose CSV file"), { target: { files: [file] } });

describe("DropZone", () => {
  it("accepts a file chosen with the file picker", () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const file = csvFile();
    chooseFile(file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("accepts a dropped file (first one only) and highlights while dragging", () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const zone = screen.getByTestId("dropzone");
    fireEvent.dragOver(zone);
    expect(zone.className).toContain("border-accent");
    const [first, second] = [csvFile(undefined, "a.csv"), csvFile(undefined, "b.csv")];
    fireEvent.drop(zone, { dataTransfer: { files: [first, second] } });
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(first);
  });

  it("ignores drops when disabled", () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} disabled />);
    fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [csvFile()] } });
    expect(onFile).not.toHaveBeenCalled();
  });

  it("opens the picker from the keyboard", () => {
    render(<DropZone onFile={vi.fn()} />);
    const click = vi.spyOn(screen.getByLabelText("Choose CSV file") as HTMLInputElement, "click");
    fireEvent.keyDown(screen.getByTestId("dropzone"), { key: "Enter" });
    expect(click).toHaveBeenCalled();
  });
});

describe("ImportView", () => {
  it("shows a preview with merchant, date and amount after choosing a file", async () => {
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile());
    const preview = await screen.findByRole("region", { name: "Transaction preview" });
    expect(within(preview).getAllByText("NETFLIX.COM")).toHaveLength(2);
    expect(within(preview).getByText("PAYROLL ACME")).toBeTruthy();
    expect(within(preview).getAllByText("−$15.49")).toHaveLength(2); // spending
    expect(within(preview).getByText("+$2,450.00")).toBeTruthy(); // money in
    expect(within(preview).getByText(/Jan 15, 2026/)).toBeTruthy();
    expect(within(preview).getByText(/3/)).toBeTruthy();
  });

  it("runs analysis, shows confidence scores and a MOCK banner, and saves NOTHING until confirmed", async () => {
    const value = appValue();
    const client = mockClient();
    render(withApp(value, <ImportView detection={client} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));

    expect(await screen.findByTestId("mock-banner")).toBeTruthy();
    const cards = await screen.findAllByTestId("suggestion");
    expect(cards.length).toBeGreaterThan(3);
    expect(within(cards[0]!).getByText("96%")).toBeTruthy(); // sorted by confidence, highest first
    expect(screen.getAllByText(/High confidence/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Low confidence/).length).toBeGreaterThan(0);

    expect(client.analyze).toHaveBeenCalledTimes(1);
    expect(value.addSubscription).not.toHaveBeenCalled();
  });

  it("confirming a suggestion saves exactly its proposed subscription, once", async () => {
    const value = appValue();
    render(withApp(value, <ImportView detection={mockClient()} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));
    const card = (await screen.findAllByTestId("suggestion"))[0]!;
    fireEvent.click(within(card).getByText("Confirm"));

    await waitFor(() => expect(within(card).getByText(/Added to your subscriptions/)).toBeTruthy());
    expect(value.addSubscription).toHaveBeenCalledTimes(1);
    expect(value.addSubscription).toHaveBeenCalledWith(expect.objectContaining({ merchant: "Netflix", priceMinor: 1549, interval: "monthly", status: "active" }));
    expect(within(card).queryByText("Confirm")).toBeNull();
  });

  it("rejecting dismisses a suggestion without saving, and can be undone", async () => {
    const value = appValue();
    render(withApp(value, <ImportView detection={mockClient()} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));
    const card = (await screen.findAllByTestId("suggestion"))[1]!;
    fireEvent.click(within(card).getByText("Reject"));
    expect(within(card).getByText("Undo")).toBeTruthy();
    expect(value.addSubscription).not.toHaveBeenCalled();
    fireEvent.click(within(card).getByText("Undo"));
    expect(within(card).getByText("Confirm")).toBeTruthy();
  });

  it("shows a save failure on the card and lets the user retry", async () => {
    const addSubscription = vi.fn().mockRejectedValueOnce(new Error("Disk full")).mockResolvedValue(undefined);
    render(withApp(appValue({ addSubscription }), <ImportView detection={mockClient()} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));
    const card = (await screen.findAllByTestId("suggestion"))[0]!;
    fireEvent.click(within(card).getByText("Confirm"));
    expect(await within(card).findByRole("alert")).toBeTruthy();
    fireEvent.click(within(card).getByText("Confirm"));
    await waitFor(() => expect(within(card).getByText(/Added/)).toBeTruthy());
  });

  it("labels suggestions that match an existing subscription", async () => {
    const existing = { id: "1", merchant: "Netflix", priceMinor: 1549, currency: "USD", interval: "monthly" as const, nextRenewal: "2030-01-01", status: "active" as const, createdAt: "t", updatedAt: "t" };
    const client = { analyze: async (t: never) => (await import("../../domain/detection/run")).runDetection((await import("../../domain/detection/mock")).mockDetector, t, { existingSubscriptions: [existing], today: "2026-10-18" }) };
    render(withApp(appValue({ subscriptions: [existing] }), <ImportView detection={client} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));
    expect(await screen.findByText("Already tracked")).toBeTruthy();
    expect(screen.getByText("Add anyway")).toBeTruthy();
  });

  it("explains a detector that is not implemented yet", async () => {
    const client = failingClient({ ok: false, error: { code: "not_implemented", message: "Recurring-payment detection is not implemented yet." } });
    render(withApp(appValue(), <ImportView detection={client} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));
    expect(await screen.findByText("Recurring-payment detection is not implemented yet.")).toBeTruthy();
    expect(screen.getByText(/isn't available in this build yet/)).toBeTruthy();
    expect(screen.queryAllByTestId("suggestion")).toHaveLength(0);
  });

  it("handles an empty result", async () => {
    const client = failingClient({ ok: true, result: { engine: { name: "x", isMock: false }, suggestions: [], warnings: [], analyzedTransactions: 3 } });
    render(withApp(appValue(), <ImportView detection={client} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));
    expect(await screen.findByText("No recurring payments found")).toBeTruthy();
    expect(screen.queryByTestId("mock-banner")).toBeNull();
  });

  it("lets the user fix column guesses, and blocks analysis until the mapping is complete", async () => {
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile("When,Who,Sum\n01/15/2026,NETFLIX.COM,-15.49\n", "odd.csv"));
    const find = await screen.findByText("Find subscriptions");
    expect((find as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Choose the Date");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Merchant / description"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "2" } });
    expect((screen.getByText("Find subscriptions") as HTMLButtonElement).disabled).toBe(false);
    expect(within(screen.getByRole("region", { name: "Transaction preview" })).getByText("NETFLIX.COM")).toBeTruthy();
  });

  it("collapses the Columns panel when the guess is usable, so the preview gets the space", async () => {
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile());
    await screen.findByRole("region", { name: "Transaction preview" });
    const mapper = screen.getByTestId("column-mapper") as HTMLDetailsElement;
    expect(mapper.open).toBe(false);
    expect(mapper.textContent).toContain("Date: Date");
    expect(mapper.textContent).toContain("Merchant: Description");
    expect(mapper.textContent).toContain("Amount: Amount");
    // the user can still open it to adjust options
    fireEvent.click(within(mapper).getByText("Edit"));
    await waitFor(() => expect(mapper.open).toBe(true));
  });

  it("keeps the Columns panel open while the mapping is incomplete, then lets it collapse", async () => {
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile("When,Who,Sum\n01/15/2026,NETFLIX.COM,-15.49\n", "odd.csv"));
    await screen.findByText("Find subscriptions");
    const mapper = screen.getByTestId("column-mapper") as HTMLDetailsElement;
    expect(mapper.open).toBe(true);
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Merchant / description"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "2" } });
    expect(mapper.open).toBe(true); // stays put while the user is editing
    expect(mapper.textContent).toContain("Date: When");
  });

  it("flips signs for exports that list charges as positive", async () => {
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile("Date,Description,Amount\n01/15/2026,NETFLIX.COM,15.49\n", "card.csv"));
    const preview = await screen.findByRole("region", { name: "Transaction preview" });
    expect(within(preview).getByText("+$15.49")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Charges are positive numbers"));
    expect(within(screen.getByRole("region", { name: "Transaction preview" })).getByText("−$15.49")).toBeTruthy();
  });

  it("rejects files with no data rows or no content", async () => {
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile("Date,Description,Amount\n", "empty.csv"));
    expect((await screen.findByRole("alert")).textContent).toContain("no data rows");
    chooseFile(new File([""], "zero.csv"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("empty"));
  });

  it("reports skipped rows instead of silently dropping them", async () => {
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile("Date,Description,Amount\n01/15/2026,NETFLIX.COM,-15.49\nnot-a-date,BAD,-1\n", "mixed.csv"));
    expect(await screen.findByText("1 rows skipped")).toBeTruthy();
  });

  it("works with sample (MOCK) data and labels it", async () => {
    const client = mockClient();
    render(withApp(appValue(), <ImportView detection={client} />));
    fireEvent.click(screen.getByText(/Try sample data/));
    expect(screen.getByText(/Sample data/)).toBeTruthy();
    expect(screen.getAllByText("MOCK").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Find subscriptions"));
    expect(await screen.findByTestId("mock-banner")).toBeTruthy();
  });

  it("stays local: no network request is made during import and analysis", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));
    await screen.findByTestId("mock-banner");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("'Start over' discards the imported data", async () => {
    render(withApp(appValue(), <ImportView detection={mockClient()} />));
    chooseFile(csvFile());
    fireEvent.click(await screen.findByText("Find subscriptions"));
    await screen.findByTestId("mock-banner");
    fireEvent.click(screen.getByText("Start over"));
    expect(screen.getByTestId("dropzone")).toBeTruthy();
    expect(screen.queryByText("NETFLIX.COM")).toBeNull();
  });
});
