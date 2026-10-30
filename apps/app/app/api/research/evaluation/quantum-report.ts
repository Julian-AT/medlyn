import { list, number, record, text } from "../../../../components/research/report-values.ts";

export function quantumReport(value: unknown) {
  const result = record(value);
  const dataset = record(result.dataset);
  const kernel = record(result.kernel);
  const models = record(kernel.models);
  return {
    available: Object.keys(models).length > 0,
    featureEncoder: text(dataset.embeddingModel),
    train: number(dataset.train),
    test: number(dataset.test),
    hardwareComplete: record(result.hardware).status === "complete",
    qaoaInstances: list(record(result.qaoa).instances).length,
    models: ["quantum_fidelity", "rbf_svm", "logistic"].map((key) => {
      const model = record(models[key]);
      return {
        key,
        accuracy: number(model.accuracy),
        low: number(list(model.accuracyCI95)[0]),
        high: number(list(model.accuracyCI95)[1]),
      };
    }),
  };
}

export type QuantumReport = ReturnType<typeof quantumReport>;
