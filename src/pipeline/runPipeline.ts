export type PipelineStage = "briefing" | "consistency" | "evidence" | "insights" | "podcast";
export type StageStatus = "running" | "done" | "error";
export type PipelineProgress = { step: PipelineStage; status: StageStatus; message?: string; };

export type PipelineContext = {
    pdfBase64: string;
    language: "en" | "pt";
    signal?: AbortSignal;
};

export type PipelineOutputs = Partial<Record<PipelineStage, any>>;

export type Runner = (args: {
    ctx: PipelineContext;
    prev: PipelineOutputs;
    emit: (p: PipelineProgress) => void;
    signal: AbortSignal;
}) => Promise<any>;

export async function runPipeline(opts: {
    ctx: PipelineContext;
    runners: Partial<Record<PipelineStage, Runner>>;
    order: PipelineStage[];
    onProgress?: (p: PipelineProgress) => void;
    onStepResult?: (step: PipelineStage, result: any) => void;
    continueOnError?: boolean;
    signal?: AbortSignal;
}): Promise<{ outputs: PipelineOutputs; status: "done" | "partial" | "aborted"; errors: Partial<Record<PipelineStage, Error>> }> {
    const { ctx, runners, order, onProgress, onStepResult, continueOnError = false, signal } = opts;
    const outputs: PipelineOutputs = {};
    const errors: Partial<Record<PipelineStage, Error>> = {};
    let status: "done" | "partial" | "aborted" = "done";

    // Use the explicitly provided signal OR a fallback from ctx (if any)
    const abortSignal = signal || ctx.signal || new AbortController().signal;

    for (const step of order) {
        if (abortSignal.aborted) {
            status = "aborted";
            break;
        }

        const runner = runners[step];
        if (!runner) {
            onProgress?.({ step, status: "done", message: "skipped" });
            continue;
        }

        onProgress?.({ step, status: "running" });

        try {
            const result = await runner({
                ctx,
                prev: { ...outputs },
                emit: (p) => onProgress?.(p),
                signal: abortSignal
            });

            if (abortSignal.aborted) {
                status = "aborted";
                break;
            }

            outputs[step] = result;
            onStepResult?.(step, result);
            onProgress?.({ step, status: "done" });
        } catch (err: any) {
            console.error(`Error in pipeline stage ${step}:`, err);
            errors[step] = err;
            onProgress?.({ step, status: "error", message: err.message });
            status = "partial";

            if (!continueOnError) {
                break;
            }
        }
    }

    return { outputs, status, errors };
}

export default runPipeline;
