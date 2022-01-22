import React from "react";
import { memo } from "../../helpers/react-memo.macro";

export const something = () => {
	memo();
	return <p>Sample text</p>;
};
