export type SubmissionInput = {
  inputOne: string;
  inputTwo: string;
  inputThree: string;
};

export type CodeSetupResponse = {
  success: boolean;
  affiliate: string;
};

export async function setCode({
  inputOne,
  inputTwo,
  inputThree,
}: SubmissionInput) {
  const formData = new FormData();

  formData.append("input_one", inputOne);
  formData.append("input_two", inputTwo);
  formData.append("input_three", inputThree);

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/codesetup`,
    {
      method: "POST",
      body: formData,
    },
  );

  const responseText = await response.text();
  let result: Partial<CodeSetupResponse> & { detail?: string } = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Backend returned an invalid response (${response.status} ${response.statusText}).`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(result.detail || "Code setup failed.");
  }

  if (!result.success || !result.affiliate) {
    throw new Error("Code setup returned an incomplete response.");
  }

  return result as CodeSetupResponse;
}