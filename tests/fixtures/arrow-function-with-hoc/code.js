import React from "react";
import { memo } from "../../helpers/react-memo.macro";

const something = HoC(() => {
	memo();
	return <p>Sample text</p>;
});

// simulating something like react-redux
function HoC(x) {
	return x;
}
