import { useParams } from "react-router-dom";
import PeopleProfile from "./PeopleProfile";

export default function PeopleProfileWrapper() {
  const { id } = useParams(); // pulls id from URL
  return <PeopleProfile userId={id} />; // passes it as prop
}