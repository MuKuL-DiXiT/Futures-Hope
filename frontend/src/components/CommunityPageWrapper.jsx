import { useParams } from "react-router-dom";
import CommunityPage  from "./CommunityPage";

export default function PeopleProfileWrapper() {
  const { id } = useParams(); // pulls id from URL
  return <CommunityPage comId={id} />; // passes it as prop
}